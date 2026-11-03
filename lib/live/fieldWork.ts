import { todayLocal } from '../core/dates';
import { db } from '../db';
import { DEMO_INITIAL_READING, DEMO_TRACTORS } from '../db/demoSeed';
import { refreshAlerts } from '../services/alerts';
import { recordMotoReading } from '../services/motoReadings';
import { recordService } from '../services/service';
import { getTractorView } from '../services/tractors';
import { acceptMechanicRequest, completeMechanicRequest, createMechanicRequest } from '../services/requests';

// 2023-yil Mingbuloq buzilishlar jadvalidagi haqiqiy nosozlik turlari.
export const FAULTS = ['Taqsimlash vali', 'Old ko‘prik yig‘ilgan', 'Maxovik', 'Starter va akkumlyator/simlar', 'Balon va diska, g‘ildirak', 'Haydovchi nasos'];
export const BREAKDOWN_EVERY = 30; // 2,5 daqiqa
const HOUR = 720; // 1 real soat = 720 qadam
// Ssenariyda tez (30 s / 2 daq), keyin real: usta 30 daqiqada keladi, ta'mir 2 soat, nosozlik ~har 3 soatda.
const acceptAfter = (scripted: boolean) => (scripted ? 6 : HOUR / 2);
const repairTicks = (scripted: boolean) => (scripted ? 24 : 2 * HOUR);
const REAL_BREAKDOWN_EVERY = 3 * HOUR;

/*
 * Jonli dala ishi — har ochilishda ssenariy boshidan boshlanadi (TICK_MS = 5 s, 12 qadam = 1 daqiqa):
 *  - 0-daqiqa: Akrombek traktori muddati o'tgan, Islomjon traktori yaqinlashmoqda, boshqalari me'yorida;
 *  - ~2-daqiqa: Adhamjon traktori "yaqinlashmoqda" holatiga o'tadi;
 *  - ~5-daqiqa: Islomjon traktori muddati o'tadi (TXK kerak), Akrombek — eskalatsiya;
 *  - 8-daqiqa: mexaniklar ikkala traktorga TXK bajaradi → yangi sikl;
 *  - keyin: real ritm — 250 soatlik sikl taxminan bir sutkaga yoyiladi, ish faqat kunduzi (06–20).
 */
export const TICK_MS = 5000;
export const SCRIPT_TICKS = 96; // 8 daqiqa
// Ssenariydan keyin real vaqt: 1 real soat ish = 1 moto-soat (faqat kunduzi 06–20).
export const REAL_RATE = TICK_MS / 3_600_000;
const OPS = ['plowing', 'cultivation', 'sowing', 'transport', 'disking'];

type Plan = { serial: string; start: number; rate: number; repairAt: number | null; mechanic: string };
export const PLAN: Plan[] = [
  { serial: DEMO_TRACTORS[0].serialNumber, start: 180, rate: 0.1, repairAt: null, mechanic: 'Inomjonov Mansurbek' },
  { serial: DEMO_TRACTORS[1].serialNumber, start: 222, rate: 0.125, repairAt: null, mechanic: 'Inomjonov Mansurbek' },
  { serial: DEMO_TRACTORS[2].serialNumber, start: 238, rate: 0.2, repairAt: SCRIPT_TICKS, mechanic: 'Yodgoraliyev Nozimjon' },
  { serial: DEMO_TRACTORS[3].serialNumber, start: 262, rate: 0.25, repairAt: SCRIPT_TICKS, mechanic: 'Rahmatov Islomjon' },
];

const listeners = new Set<() => void>();
export const onLiveTick = (fn: () => void) => {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
};

const isDay = (d = new Date()) => d.getHours() >= 6 && d.getHours() < 20;

/** Ssenariyni boshidan qo'yadi: shu traktorlarning yozuvlari tozalanib, boshlang'ich holat yoziladi. */
export async function resetScenario(today = todayLocal()): Promise<void> {
  carry.length = 0;
  paused.length = 0;
  openedAtTick.clear();
  const tractors = await db.tractors.list();
  const users = await db.users.list();
  const ids = new Set<string>();
  for (const [i, d] of DEMO_TRACTORS.entries()) {
    const tr = tractors.find((x) => x.serialNumber === d.serialNumber);
    if (!tr) continue;
    ids.add(tr.id);
    await db.tractors.update(tr.id, { initialReading: DEMO_INITIAL_READING, operatorName: d.operatorName, registrationDate: today });
    void i;
  }
  for (const c of [db.motoReadings, db.serviceRecords, db.notifications, db.partsRequests, db.mechanicRequests] as const) {
    const all = await (c as typeof db.motoReadings).list();
    await (c as typeof db.motoReadings).replaceAll(all.filter((x) => !ids.has((x as { tractorId: string }).tractorId)));
  }
  await seedHistory(today, tractors, users);
  for (const [i, p] of PLAN.entries()) {
    const tr = tractors.find((x) => x.serialNumber === p.serial);
    const op = users.find((u) => u.name === DEMO_TRACTORS[i].operatorName);
    if (!tr || !op) continue;
    await recordMotoReading({
      tractorId: tr.id,
      date: today,
      reading: p.start,
      shares: [{ operationTypeId: OPS[i], hours: 0 }],
      fuelLiters: null,
      note: 'Smena boshi',
      userId: op.id,
      confirmOver24h: true,
    });
  }
}

/** Bitta qadam (tick — ssenariy boshidan beri qadamlar soni). */
export async function liveTick(tick: number, today = todayLocal(), now = new Date()): Promise<void> {
  const tractors = await db.tractors.list();
  const users = await db.users.list();
  const readings = await db.motoReadings.list();
  for (const [i, p] of PLAN.entries()) {
    const tr = tractors.find((x) => x.serialNumber === p.serial);
    const op = users.find((u) => u.name === DEMO_TRACTORS[i].operatorName);
    if (!tr || !op) continue;
    const mine = readings.filter((r) => r.tractorId === tr.id);
    const last = mine.length ? Math.max(...mine.map((r) => r.reading)) : tr.initialReading;
    const scripted = tick <= SCRIPT_TICKS;
    // Ssenariy davomida reja bo'yicha, keyin real ritm bilan (faqat kunduzi).
    const openReq = (await db.mechanicRequests.list()).find((m) => m.tractorId === tr.id && m.status !== 'completed');
    const working = isDay(now) && !openReq;
    // Nosozlik paytida traktor turadi: moto-soat oshmaydi.
    if (scripted && openReq) paused[i] = (paused[i] ?? 0) + 1;
    const target = scripted ? (openReq ? last : p.start + p.rate * (tick - (paused[i] ?? 0))) : last + (carry[i] = (carry[i] ?? 0) + (working ? REAL_RATE : 0));
    const next = Math.round(target * 10) / 10;
    if (!scripted && next - last >= 0.5) carry[i] = 0;
    if (next - last >= 0.5 || (scripted && tick === SCRIPT_TICKS && next > last)) {
      await recordMotoReading({
        tractorId: tr.id,
        date: today,
        reading: next,
        shares: [{ operationTypeId: OPS[(i + tick) % OPS.length], hours: 0 }],
        fuelLiters: null,
        note: `Daladagi ish, ${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`,
        userId: op.id,
        confirmOver24h: true,
      });
    } else {
      await refreshAlerts(tr.id, today);
    }
    await handleBreakdown(tick, i, tr.id, op.id, users, now);
    const v = await getTractorView(tr.id, today);
    const due = v.recommended;
    const mech = users.find((u) => u.name === p.mechanic) ?? users.find((u) => u.role === 'technician');
    const scriptedRepair = p.repairAt !== null && tick === p.repairAt;
    const escalated = !scripted && (await db.notifications.list()).some(
      (n) => n.tractorId === tr.id && n.kind === 'escalation' && !n.isRead,
    );
    if (!due || !mech || !(scriptedRepair || escalated)) continue;
    const level = (await db.regulation.list()).find((l) => l.code === due);
    if (!level) continue;
    await recordService({
      tractorId: tr.id,
      levelCode: level.code,
      date: today,
      durationHours: level.durationHours,
      usedParts: level.parts.map((x) => ({ name: x.name, quantity: x.quantity })),
      note: 'Rejali texnik xizmat bajarildi',
      photoUris: [],
      userId: mech.id,
    });
    for (const n of await db.notifications.list()) {
      if (n.tractorId === tr.id && !n.isRead && n.kind !== 'mechanic') await db.notifications.update(n.id, { isRead: true });
    }
  }
}

let started = false;
export function startFieldWork(): void {
  if (started) return;
  started = true;
  let tick = 0;
  let busy = false;
  resetScenario()
    .catch(() => undefined)
    .then(() => {
      listeners.forEach((fn) => fn());
      setInterval(async () => {
        if (busy) return;
        busy = true;
        try {
          tick += 1;
          await liveTick(tick);
          listeners.forEach((fn) => fn());
        } catch {
          // jonli ish xatosi ilovani to'xtatmasin
        } finally {
          busy = false;
        }
      }, TICK_MS);
    });
}

const openedAtTick = new Map<string, number>();
const carry: number[] = [];
const paused: number[] = [];

// Nosozlik sikli: operator xabar beradi → usta qabul qiladi (ta'mirlanmoqda) → ta'mir tugaydi.
async function handleBreakdown(
  tick: number,
  i: number,
  tractorId: string,
  operatorId: string,
  users: { id: string; name: string; role: string }[],
  _now: Date,
): Promise<void> {
  const open = (await db.mechanicRequests.list()).find((m) => m.tractorId === tractorId && m.status !== 'completed');
  if (open) {
    if (!openedAtTick.has(open.id)) openedAtTick.set(open.id, tick);
    const age = tick - openedAtTick.get(open.id)!;
    const tech = users.find((u) => u.name === PLAN[i].mechanic) ?? users.find((u) => u.role === 'technician');
    const sc = openedAtTick.get(open.id)! <= SCRIPT_TICKS;
    if (open.status === 'pending' && age >= acceptAfter(sc) && tech) await acceptMechanicRequest(open.id, tech.id);
    if (open.status === 'in_progress' && age >= acceptAfter(sc) + repairTicks(sc)) {
      await completeMechanicRequest(open.id, 'Nosozlik bartaraf etildi, traktor ishga tushirildi');
    }
    return;
  }
  // Har 2,5 daqiqada navbatdagi traktorda nosozlik (birinchisi 1-daqiqada).
  const every = tick <= SCRIPT_TICKS ? BREAKDOWN_EVERY : REAL_BREAKDOWN_EVERY;
  const base = tick <= SCRIPT_TICKS ? 12 : SCRIPT_TICKS;
  const n = Math.floor((tick - base) / every);
  if (tick >= 12 && (tick - base) % every === 0 && tick !== SCRIPT_TICKS && n % PLAN.length === i) {
    const fault = FAULTS[n % FAULTS.length];
    const req = await createMechanicRequest({ tractorId, problem: fault, userId: operatorId });
    openedAtTick.set(req.id, tick);
  }
}

// O'tgan oy tarixi (2023-yil Mingbuloq jadvalidagi nosozliklar va ta'mir vaqtlari, daqiqada) — hisobotlar real bo'lishi uchun.
const HISTORY: { serial: string; daysAgo: number; problem: string; repairMin: number }[] = [
  { serial: 'A2003495', daysAgo: 24, problem: 'Taqsimlash vali', repairMin: 1035 },
  { serial: 'A2003495', daysAgo: 9, problem: 'Old ko‘prik yig‘ilgan', repairMin: 150 },
  { serial: 'A2003707', daysAgo: 22, problem: 'Maxovik', repairMin: 750 },
  { serial: 'A2003707', daysAgo: 6, problem: 'Old ko‘prik yig‘ilgan', repairMin: 150 },
  { serial: 'A2004017', daysAgo: 15, problem: 'Starter va akkumlyator/simlar', repairMin: 60 },
  { serial: 'A2004017', daysAgo: 4, problem: 'Balon va diska, g‘ildirak', repairMin: 165 },
  { serial: 'A2004100', daysAgo: 20, problem: 'Haydovchi nasos', repairMin: 90 },
];

function daysBefore(today: string, n: number): string {
  const d = new Date(today + 'T08:00:00');
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

async function seedHistory(
  today: string,
  tractors: { id: string; serialNumber: string }[],
  users: { id: string; name: string; role: string }[],
): Promise<void> {
  const techs = users.filter((u) => u.role === 'technician');
  const o100 = (await db.regulation.list()).find((l) => l.code === 'O100');
  for (const [k, h] of HISTORY.entries()) {
    const tr = tractors.find((x) => x.serialNumber === h.serial);
    const i = DEMO_TRACTORS.findIndex((d) => d.serialNumber === h.serial);
    const op = users.find((u) => u.name === DEMO_TRACTORS[i]?.operatorName);
    const tech = techs[k % Math.max(1, techs.length)];
    if (!tr || !op || !tech) continue;
    const opened = daysBefore(today, h.daysAgo);
    const closed = new Date(new Date(opened).getTime() + h.repairMin * 60_000).toISOString();
    await db.mechanicRequests.insert({
      tractorId: tr.id, problem: h.problem, status: 'completed', openedAt: opened, closedAt: closed,
      userId: op.id, technicianId: tech.id, technicianNotes: 'Nosozlik bartaraf etildi', createdAt: opened,
    } as never);
  }
  // Obkatka TXK-100 o'tgan oyda bajarilgan (hisoblagichlarga ta'sir qilmaydi — bir martalik daraja).
  for (const [i, d] of DEMO_TRACTORS.entries()) {
    const tr = tractors.find((x) => x.serialNumber === d.serialNumber);
    const tech = techs[i % Math.max(1, techs.length)];
    if (!tr || !tech || !o100) continue;
    const date = daysBefore(today, 26 - i * 2).slice(0, 10);
    await db.serviceRecords.insert({
      tractorId: tr.id, levelCode: 'O100', date, reading: 100, durationHours: o100.durationHours,
      usedParts: o100.parts.map((x) => ({ name: x.name, quantity: x.quantity })), note: 'Obkatka TXK-100',
      photoUris: [], userId: tech.id, createdAt: date + 'T09:00:00.000Z',
    } as never);
  }
}
