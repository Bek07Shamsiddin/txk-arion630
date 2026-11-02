import { loadFactor } from './loadFactor';
import { mulberry32 } from './rng';
import type { CoreSettings, OperationType } from './types';

/**
 * Monte-Karlo simulyatori (spec 4.7). Faqat bitta TXK darajasi (T250, `intervalHours`) modellashtiriladi.
 * Natijalar imitatsion model natijalari; real ma'lumot bilan tasdiqlanishi kerak.
 */
export type SimParams = {
  tractors: number;
  seasonDays: number;
  dailyHoursMin: number;
  dailyHoursMax: number;
  operationMix: { operationTypeId: string; share: number }[];
  intervalHours: number;
  leadDays: number;
  serviceDurationHours: number;
  costService: number;
  costRepair: number;
  costDowntimeHour: number;
  lambda0: number;
  wearA: number;
  repairDays: number;
  beta: number;
  runs: number;
  seed: number;
};
export type Stat = { mean: number; lo: number; hi: number };
export type StrategySummary = {
  readiness: Stat;
  failures: Stat;
  services: Stat;
  downtimeHours: Stat;
  totalCost: Stat;
};

export const DEFAULT_SIM_PARAMS: SimParams = {
  tractors: 10,
  seasonDays: 180,
  dailyHoursMin: 6,
  dailyHoursMax: 12,
  operationMix: [
    { operationTypeId: 'plowing', share: 0.3 },
    { operationTypeId: 'cultivation', share: 0.3 },
    { operationTypeId: 'sowing', share: 0.2 },
    { operationTypeId: 'transport', share: 0.2 },
  ],
  intervalHours: 250,
  leadDays: 7,
  serviceDurationHours: 1,
  costService: 1_500_000,
  costRepair: 12_000_000,
  costDowntimeHour: 150_000,
  lambda0: 0.0005,
  wearA: 4,
  repairDays: 3,
  beta: 0.5,
  runs: 200,
  seed: 42,
};

const NON_NEGATIVE: (keyof SimParams)[] = [
  'leadDays',
  'serviceDurationHours',
  'costService',
  'costRepair',
  'costDowntimeHour',
  'lambda0',
  'wearA',
  'repairDays',
];

/** Parametrlarni tekshiradi; bo'sh obyekt — hammasi to'g'ri. */
export function validateSimParams(p: SimParams): Record<string, string> {
  const e: Record<string, string> = {};
  const inRange = (v: number, lo: number, hi: number) => Number.isFinite(v) && v >= lo && v <= hi;
  if (!inRange(p.tractors, 1, 100)) e.tractors = "Traktorlar soni 1 dan 100 gacha bo'lishi kerak";
  if (!inRange(p.seasonDays, 1, 365)) e.seasonDays = "Mavsum kunlari 1 dan 365 gacha bo'lishi kerak";
  if (!(p.dailyHoursMin > 0)) e.dailyHoursMin = "Kunlik minimal soat noldan katta bo'lishi kerak";
  if (!inRange(p.dailyHoursMax, p.dailyHoursMin, 24)) {
    e.dailyHoursMax = "Kunlik maksimal soat minimaldan kichik bo'lmasligi va 24 dan oshmasligi kerak";
  }
  if (!inRange(p.runs, 1, 1000)) e.runs = "Takrorlar soni 1 dan 1000 gacha bo'lishi kerak";
  if (!inRange(p.beta, 0, 1)) e.beta = "β 0 dan 1 gacha bo'lishi kerak";
  if (!(p.intervalHours > 0)) e.intervalHours = "TXK intervali noldan katta bo'lishi kerak";
  if (!Number.isFinite(p.seed)) e.seed = "Seed son bo'lishi kerak";
  for (const k of NON_NEGATIVE) {
    const v = p[k] as number;
    if (!(Number.isFinite(v) && v >= 0)) e[k] = "Qiymat manfiy bo'lmasligi kerak";
  }
  const sum = p.operationMix.reduce((acc, m) => acc + m.share, 0);
  if (p.operationMix.length === 0 || p.operationMix.some((m) => !(m.share >= 0)) || Math.abs(sum - 1) >= 0.001) {
    e.operationMix = "Ish turlari ulushlari yig'indisi 1 ga teng bo'lishi kerak";
  }
  return e;
}

/** Bir takror uchun umumiy tasodifiy sonlar, indeks = traktor·D + kun. */
type Draws = { hours: Float64Array; mixIdx: Int32Array; u: Float64Array };
type Totals = { work: number; serviceHours: number; downtime: number; failures: number; services: number };
type RunMetrics = { readiness: number; failures: number; services: number; downtimeHours: number; totalCost: number };
type Model = { p: SimParams; s: CoreSettings; k: number[]; wearK: number[]; mu: number };

/** Ish soati U(min,max), ish turi (mix bo'yicha) va nosozlik uchun u — har kun bir marta. */
function drawRun(p: SimParams, seed: number): Draws {
  const rng = mulberry32(seed);
  const n = p.tractors * p.seasonDays;
  const d: Draws = { hours: new Float64Array(n), mixIdx: new Int32Array(n), u: new Float64Array(n) };
  for (let i = 0; i < n; i++) {
    d.hours[i] = p.dailyHoursMin + rng() * (p.dailyHoursMax - p.dailyHoursMin);
    const r = rng();
    let acc = 0;
    let j = 0;
    for (; j < p.operationMix.length - 1; j++) {
      acc += p.operationMix[j].share;
      if (r < acc) break;
    }
    d.mixIdx[i] = j;
    d.u[i] = rng();
  }
  return d;
}

/** Bitta traktor, bitta strategiya, butun mavsum (kunlik qadam). adaptive = S2. */
function runTractor(m: Model, d: Draws, offset: number, adaptive: boolean, t: Totals): void {
  const { p, s } = m;
  const H = p.intervalHours;
  let phys = 0;
  let equiv = 0;
  let wear = 0;
  let repairEnd = 0;
  let arrival: number | null = null; // buyurtma qilingan qismlar keladigan kun
  for (let day = 0; day < p.seasonDays; day++) {
    if (day < repairEnd) continue;
    const i = offset + day;
    let hours = d.hours[i];
    // S1: qismlar kelgan kuni TXK. S2: muddat kelgan va qismlar bor bo'lsa.
    const due = adaptive ? equiv >= H || phys >= s.gamma * H : true;
    if (arrival !== null && day >= arrival && due) {
      hours = Math.max(0, hours - p.serviceDurationHours);
      t.serviceHours += p.serviceDurationHours;
      t.services++;
      phys = 0;
      equiv = 0;
      wear = 0;
      arrival = null;
    }
    const mi = d.mixIdx[i];
    phys += hours;
    equiv += hours * m.k[mi];
    wear += hours * m.wearK[mi];
    t.work += hours;
    if (arrival === null) {
      const order = adaptive
        ? equiv >= H || phys >= s.gamma * H || (H - equiv) / m.mu <= p.leadDays + s.reorderBufferDays
        : phys >= H;
      if (order) arrival = day + p.leadDays;
    }
    const pFail = 1 - Math.exp(-p.lambda0 * hours * (1 + p.wearA * Math.max(0, wear / H - 1) ** 2));
    if (d.u[i] < pFail) {
      t.failures++;
      t.downtime += p.repairDays * s.shiftHoursPerDay;
      repairEnd = day + 1 + p.repairDays;
    }
  }
}

function runStrategy(m: Model, d: Draws, adaptive: boolean): RunMetrics {
  const { p } = m;
  const t: Totals = { work: 0, serviceHours: 0, downtime: 0, failures: 0, services: 0 };
  for (let tr = 0; tr < p.tractors; tr++) runTractor(m, d, tr * p.seasonDays, adaptive, t);
  const denom = t.work + t.serviceHours + t.downtime;
  return {
    readiness: denom > 0 ? t.work / denom : 0,
    failures: t.failures,
    services: t.services,
    downtimeHours: t.downtime,
    totalCost: t.services * p.costService + t.failures * p.costRepair + t.downtime * p.costDowntimeHour,
  };
}

function buildModel(p: SimParams, ops: OperationType[], s: CoreSettings): Model {
  const k = p.operationMix.map((mx) => {
    const op = ops.find((o) => o.id === mx.operationTypeId);
    if (!op) throw new Error(`Noma'lum ish turi: ${mx.operationTypeId}`);
    return loadFactor(op, s);
  });
  const meanHours = (p.dailyHoursMin + p.dailyHoursMax) / 2;
  // μ: rejalashtiruvchi β ni bilmaydi, shuning uchun K (β = 1) ishlatiladi.
  const mu = meanHours * p.operationMix.reduce((acc, mx, j) => acc + mx.share * k[j], 0);
  return { p, s, k, wearK: k.map((x) => x ** p.beta), mu };
}

async function runAll(
  p: SimParams,
  ops: OperationType[],
  s: CoreSettings,
  onProgress?: (done: number) => void,
): Promise<{ s1: RunMetrics[]; s2: RunMetrics[] }> {
  const errors = validateSimParams(p);
  if (Object.keys(errors).length > 0) throw new Error(Object.values(errors)[0]);
  const m = buildModel(p, ops, s);
  const s1: RunMetrics[] = [];
  const s2: RunMetrics[] = [];
  for (let r = 0; r < p.runs; r++) {
    const d = drawRun(p, p.seed + r);
    s1.push(runStrategy(m, d, false));
    s2.push(runStrategy(m, d, true));
    const done = r + 1;
    if (done % 20 === 0 || done === p.runs) {
      await new Promise((res) => setTimeout(res, 0));
      onProgress?.(done);
    }
  }
  return { s1, s2 };
}

/** O'rtacha va 95% ishonch oralig'i: mean ± 1.96·sd/√R (R = 1 da sd = 0). */
function stat(xs: number[]): Stat {
  const n = xs.length;
  const mean = xs.reduce((a, b) => a + b, 0) / n;
  const sd = n > 1 ? Math.sqrt(xs.reduce((a, x) => a + (x - mean) ** 2, 0) / (n - 1)) : 0;
  const h = (1.96 * sd) / Math.sqrt(n);
  return { mean, lo: mean - h, hi: mean + h };
}

function summarize(rs: RunMetrics[]): StrategySummary {
  const pick = (key: keyof RunMetrics) => stat(rs.map((r) => r[key]));
  return {
    readiness: pick('readiness'),
    failures: pick('failures'),
    services: pick('services'),
    downtimeHours: pick('downtimeHours'),
    totalCost: pick('totalCost'),
  };
}

/** S1 (fizik soat) va S2 (keltirilgan soat + oldindan buyurtma) strategiyalarini solishtiradi. */
export async function simulate(
  p: SimParams,
  ops: OperationType[],
  s: CoreSettings,
  onProgress?: (done: number) => void,
): Promise<{ s1: StrategySummary; s2: StrategySummary }> {
  const { s1, s2 } = await runAll(p, ops, s, onProgress);
  return { s1: summarize(s1), s2: summarize(s2) };
}

/** β bo'yicha sezgirlik: har β uchun S2 − S1 jami xarajat farqi (juftlangan takrorlar bo'yicha). */
export async function sensitivity(
  p: SimParams,
  ops: OperationType[],
  s: CoreSettings,
  betas: number[] = [0, 0.25, 0.5, 0.75, 1],
): Promise<{ beta: number; costDiff: Stat }[]> {
  const out: { beta: number; costDiff: Stat }[] = [];
  for (const beta of betas) {
    const { s1, s2 } = await runAll({ ...p, beta }, ops, s);
    out.push({ beta, costDiff: stat(s2.map((r, i) => r.totalCost - s1[i].totalCost)) });
  }
  return out;
}
