import { parseDecimal } from './core/numbers';
import type { OperationType } from './core/types';
import { t } from './i18n/uz';
import { validateSimParams, type SimParams, type Stat, type StrategySummary } from './core/simulator';

/** Simulyator formasi: barcha maydonlar matn ko'rinishida, ulushlar ish turi id si bo'yicha. */
export const SIM_NUMERIC_KEYS = [
  'tractors',
  'seasonDays',
  'dailyHoursMin',
  'dailyHoursMax',
  'intervalHours',
  'leadDays',
  'serviceDurationHours',
  'costService',
  'costRepair',
  'costDowntimeHour',
  'lambda0',
  'wearA',
  'repairDays',
  'beta',
  'runs',
  'seed',
] as const;
export type SimNumericKey = (typeof SIM_NUMERIC_KEYS)[number];
export type SimFormState = Record<SimNumericKey, string> & { mix: Record<string, string> };

export function paramsToForm(p: SimParams, ops: OperationType[]): SimFormState {
  const out = { mix: {} as Record<string, string> } as SimFormState;
  for (const k of SIM_NUMERIC_KEYS) out[k] = String(p[k]);
  for (const op of ops) {
    const m = p.operationMix.find((x) => x.operationTypeId === op.id);
    out.mix[op.id] = String(m ? m.share : 0);
  }
  return out;
}

/** Ulushlar yig'indisi (noto'g'ri qatorlar 0 hisoblanadi). */
export function mixSum(mix: Record<string, string>): number {
  return Object.values(mix).reduce((s, v) => s + (parseDecimal(v) ?? 0), 0);
}

/**
 * Formani SimParams ga o'giradi. Xatolar maydon kaliti bo'yicha (ulushlar uchun `operationMix`).
 * Xato bo'lsa params = null.
 */
export function buildSimParams(
  form: SimFormState,
  ops: OperationType[],
): { params: SimParams | null; errors: Record<string, string> } {
  const parseErrors: Record<string, string> = {};
  const nums = {} as Record<SimNumericKey, number>;
  for (const k of SIM_NUMERIC_KEYS) {
    const v = parseDecimal(form[k]);
    if (v === null) {
      parseErrors[k] = t.sim.notNumber;
      nums[k] = NaN;
    } else {
      nums[k] = v;
    }
  }
  const operationMix: SimParams['operationMix'] = [];
  for (const op of ops) {
    const text = form.mix[op.id] ?? '0';
    const v = parseDecimal(text);
    const share = v === null ? NaN : v;
    if (share !== 0) operationMix.push({ operationTypeId: op.id, share });
  }
  const params: SimParams = { ...nums, operationMix };
  const errors = { ...validateSimParams(params), ...parseErrors };
  return { params: Object.keys(errors).length === 0 ? params : null, errors };
}

const fixZero = (s: string) => (/^-0(\.0+)?$/.test(s) ? s.slice(1) : s);

export const fmtK = (n: number): string => fixZero(n.toFixed(3));
export const fmtCount = (n: number): string => fixZero(n.toFixed(1));
export function fmtMoney(n: number): string {
  const r = Math.round(n);
  if (r === 0) return '0';
  const digits = String(Math.abs(r)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return r < 0 ? `-${digits}` : digits;
}

/** "o'rtacha [lo; hi]". */
export function fmtStat(s: Stat, f: (n: number) => string): string {
  return `${f(s.mean)} [${f(s.lo)}; ${f(s.hi)}]`;
}

/** Farq: musbat bo'lsa "+" bilan, nol — belgisiz. */
export function fmtDiff(v: number, f: (n: number) => string): string {
  const s = f(v);
  return v > 0 && !s.startsWith('-') && !/^0(\.0+)?$/.test(s) ? `+${s}` : s;
}

export type ResultRow = { key: keyof StrategySummary; label: string; s1: string; s2: string; diff: string };

const METRICS: { key: keyof StrategySummary; f: (n: number) => string }[] = [
  { key: 'readiness', f: fmtK },
  { key: 'failures', f: fmtCount },
  { key: 'services', f: fmtCount },
  { key: 'downtimeHours', f: fmtCount },
  { key: 'totalCost', f: fmtMoney },
];

/** Natija jadvali qatorlari; farq = S2 o'rtachasi − S1 o'rtachasi. */
export function resultRows(s1: StrategySummary, s2: StrategySummary): ResultRow[] {
  return METRICS.map(({ key, f }) => ({
    key,
    label: t.sim.metrics[key],
    s1: fmtStat(s1[key], f),
    s2: fmtStat(s2[key], f),
    diff: fmtDiff(s2[key].mean - s1[key].mean, f),
  }));
}

/** Sezgirlik grafigi uchun o'q: 0 har doim oralig'da; pos(v) — 0 (yuqori, max) .. 1 (pastki, min). */
export function chartScale(points: { beta: number; costDiff: Stat }[]): {
  min: number;
  max: number;
  pos: (v: number) => number;
} {
  let min = 0;
  let max = 0;
  for (const p of points) {
    min = Math.min(min, p.costDiff.lo, p.costDiff.mean);
    max = Math.max(max, p.costDiff.hi, p.costDiff.mean);
  }
  if (max === min) max = min + 1;
  return { min, max, pos: (v) => (max - v) / (max - min) };
}
