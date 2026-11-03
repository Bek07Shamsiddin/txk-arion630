import { downtimeHours, technicalReadiness } from './core/readiness';
import { db } from './db';
import { listTractorViews } from './services/tractors';

const inRange = (date: string, from: string, to: string) => date >= from && date <= to;
const round1 = (n: number) => Math.round(n * 10) / 10;

export type ReadinessRow = {
  tractorId: string;
  model: string;
  work: number;
  service: number;
  downtime: number;
  kTt: number | null;
};

/** Davr [from, to] uchun texnik tayyorlik koeffitsienti K_tt. */
export async function readinessByTractor(from: string, to: string): Promise<ReadinessRow[]> {
  const [tractors, readings, services, requests, settings] = await Promise.all([
    db.tractors.list(),
    db.motoReadings.list(),
    db.serviceRecords.list(),
    db.mechanicRequests.list(),
    db.settings.get(),
  ]);
  const nowIso = new Date().toISOString();
  return tractors.map((t) => {
    const work = readings
      .filter((r) => r.tractorId === t.id && inRange(r.date, from, to))
      .reduce((s, r) => s + r.physHours, 0);
    const service = services
      .filter((r) => r.tractorId === t.id && inRange(r.date, from, to))
      .reduce((s, r) => s + r.durationHours, 0);
    const downtime = requests
      .filter((r) => r.tractorId === t.id && inRange(r.openedAt.slice(0, 10), from, to))
      .reduce((s, r) => s + downtimeHours(r.openedAt, r.closedAt ?? nowIso, settings.shiftHoursPerDay), 0);
    return { tractorId: t.id, model: t.model, work, service, downtime, kTt: technicalReadiness(work, service, downtime) };
  });
}

export type PhysVsEquivRow = { tractorId: string; model: string; phys: number; equiv: number; ratio: number };

/** Fizik va keltirilgan soatlar (barcha yozuvlar bo'yicha); ratio = equiv / phys. */
export async function physVsEquiv(): Promise<PhysVsEquivRow[]> {
  const [tractors, readings] = await Promise.all([db.tractors.list(), db.motoReadings.list()]);
  return tractors.map((t) => {
    const mine = readings.filter((r) => r.tractorId === t.id);
    const phys = mine.reduce((s, r) => s + r.physHours, 0);
    const equiv = mine.reduce((s, r) => s + r.equivHours, 0);
    return { tractorId: t.id, model: t.model, phys, equiv, ratio: phys > 0 ? equiv / phys : 1 };
  });
}

export type OverdueRow = { tractorId: string; model: string; levelName: string; overdueHours: number };

export async function overdueList(today: string): Promise<OverdueRow[]> {
  const views = await listTractorViews(today);
  const out: OverdueRow[] = [];
  for (const v of views) {
    for (const s of v.statuses) {
      if (s.state === 'overdue') {
        out.push({
          tractorId: v.tractor.id,
          model: v.tractor.model,
          levelName: s.name,
          overdueHours: round1(Math.abs(s.remainingHours)),
        });
      }
    }
  }
  return out;
}

export type PartsUsageRow = { partName: string; requested: number; delivered: number };

export async function partsUsage(): Promise<PartsUsageRow[]> {
  const reqs = await db.partsRequests.list();
  const map = new Map<string, PartsUsageRow>();
  for (const r of reqs) {
    if (r.status === 'cancelled') continue;
    const row = map.get(r.partName) ?? { partName: r.partName, requested: 0, delivered: 0 };
    row.requested += r.quantity;
    if (r.status === 'delivered') row.delivered += r.quantity;
    map.set(r.partName, row);
  }
  return [...map.values()].sort((a, b) => b.requested - a.requested || a.partName.localeCompare(b.partName));
}

export type OperatorActivityRow = {
  userId: string;
  name: string;
  tractorId: string;
  model: string;
  hours: number;
  days: number;
};

export async function operatorActivity(from: string, to: string): Promise<OperatorActivityRow[]> {
  const [readings, users, tractors] = await Promise.all([db.motoReadings.list(), db.users.list(), db.tractors.list()]);
  const groups = new Map<string, { userId: string; tractorId: string; hours: number; dates: Set<string> }>();
  for (const r of readings) {
    if (!inRange(r.date, from, to)) continue;
    const key = `${r.userId}|${r.tractorId}`;
    const g = groups.get(key) ?? { userId: r.userId, tractorId: r.tractorId, hours: 0, dates: new Set<string>() };
    g.hours += r.physHours;
    g.dates.add(r.date);
    groups.set(key, g);
  }
  return [...groups.values()]
    .map((g) => ({
      userId: g.userId,
      name: users.find((u) => u.id === g.userId)?.name ?? '—',
      tractorId: g.tractorId,
      model: tractors.find((t) => t.id === g.tractorId)?.model ?? '—',
      hours: g.hours,
      days: g.dates.size,
    }))
    .sort((a, b) => a.name.localeCompare(b.name) || a.model.localeCompare(b.model));
}
