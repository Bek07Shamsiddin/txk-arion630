import type { CoreSettings, LevelCounter, RegulationLevel } from '../core/types';
import {
  evaluateLevels,
  nextDue,
  recommendedLevel,
  replayCounters,
  type LevelStatus,
  type ReplayEvent,
} from '../core/regulation';
import { dailyIntensity, forecastDue, type DailyEquiv } from '../core/forecast';
import { db } from '../db';
import type { MotoReading, ServiceRecord, Tractor } from '../db/schema';

export type TractorView = {
  tractor: Tractor;
  currentReading: number;
  totalEquivHours: number;
  statuses: LevelStatus[];
  next: LevelStatus | null;
  recommended: string | null;
  forecast: { days: number; date: string } | null;
  color: 'green' | 'yellow' | 'red';
};

export type Intensities = { equiv: number | null; phys: number | null };
export type Forecast = { days: number; date: string };

/** Sana, keyin createdAt bo'yicha barqaror tartib. */
export function byDateThenCreated<T extends { date: string; createdAt: string }>(items: T[]): T[] {
  return items
    .map((x, i) => ({ x, i }))
    .sort((a, b) =>
      a.x.date !== b.x.date
        ? a.x.date < b.x.date ? -1 : 1
        : a.x.createdAt !== b.x.createdAt
          ? a.x.createdAt < b.x.createdAt ? -1 : 1
          : a.i - b.i,
    )
    .map((o) => o.x);
}

export function daysBetween(from: string, to: string): number {
  const p = (d: string) => {
    const [y, m, dd] = d.split('-').map(Number);
    return Date.UTC(y, m - 1, dd) / 86_400_000;
  };
  return Math.round(p(to) - p(from));
}

/**
 * R6: daraja prognozi = min(ekvivalent qoldiq / ekv. intensivlik, fizik qoldiq / fiz. intensivlik).
 * Intensivligi null shartlar e'tiborga olinmaydi; hech biri bo'lmasa null.
 */
export function forecastForLevel(
  level: RegulationLevel,
  counter: LevelCounter,
  settings: CoreSettings,
  intensities: Intensities,
  currentReading: number,
  today: string,
): Forecast | null {
  const candidates: (Forecast | null)[] = [];
  if (level.kind === 'once') {
    candidates.push(forecastDue(level.intervalHours - currentReading, intensities.phys, today));
  } else {
    candidates.push(forecastDue(level.intervalHours - counter.equivSince, intensities.equiv, today));
    candidates.push(forecastDue(settings.gamma * level.intervalHours - counter.physSince, intensities.phys, today));
  }
  let best: Forecast | null = null;
  for (const c of candidates) if (c && (!best || c.days < best.days)) best = c;
  return best;
}

export type TractorState = {
  view: TractorView;
  levels: RegulationLevel[];
  counters: LevelCounter[];
  settings: CoreSettings;
  forecasts: Map<string, Forecast | null>;
};

export function currentReadingOf(tractor: Tractor, readings: MotoReading[]): number {
  const sorted = byDateThenCreated(readings);
  return sorted.length ? sorted[sorted.length - 1].reading : tractor.initialReading;
}

export async function loadTractorState(tractorId: string, today: string): Promise<TractorState> {
  const tractor = await db.tractors.get(tractorId);
  if (!tractor) throw new Error('Traktor topilmadi');
  const [settings, levels, allReadings, allServices] = await Promise.all([
    db.settings.get(),
    db.regulation.list(),
    db.motoReadings.list(),
    db.serviceRecords.list(),
  ]);
  const readings = allReadings.filter((r) => r.tractorId === tractorId);
  const services = allServices.filter((s) => s.tractorId === tractorId);

  const items: { date: string; createdAt: string; event: ReplayEvent }[] = [
    ...readings.map((r) => ({
      date: r.date,
      createdAt: r.createdAt,
      event: { type: 'reading', date: r.date, physHours: r.physHours, equivHours: r.equivHours } as ReplayEvent,
    })),
    ...services.map((s: ServiceRecord) => ({
      date: s.date,
      createdAt: s.createdAt,
      event: { type: 'service', date: s.date, levelCode: s.levelCode } as ReplayEvent,
    })),
  ];
  const events = byDateThenCreated(items).map((i) => i.event);
  const counters = replayCounters(levels, tractor.initialReading, tractor.registrationDate, events);

  const currentReading = currentReadingOf(tractor, readings);
  const totalEquivHours = readings.reduce((s, r) => s + r.equivHours, 0);
  const statuses = evaluateLevels(counters, levels, settings, currentReading, today);
  const next = nextDue(statuses);
  const recommended = recommendedLevel(statuses, levels);

  const equivDaily: DailyEquiv[] = readings.map((r) => ({ date: r.date, equivHours: r.equivHours }));
  const physDaily: DailyEquiv[] = readings.map((r) => ({ date: r.date, equivHours: r.physHours }));
  const intensities: Intensities = {
    equiv: dailyIntensity(equivDaily, today),
    phys: dailyIntensity(physDaily, today),
  };
  const forecasts = new Map<string, Forecast | null>();
  for (const st of statuses) {
    const level = levels.find((l) => l.code === st.code)!;
    const counter = counters.find((c) => c.code === st.code)!;
    forecasts.set(
      st.code,
      st.remainingHours <= 0
        ? { days: 0, date: today }
        : forecastForLevel(level, counter, settings, intensities, currentReading, today),
    );
  }

  const color: TractorView['color'] = statuses.some((s) => s.state === 'overdue')
    ? 'red'
    : statuses.some((s) => s.state === 'soon')
      ? 'yellow'
      : 'green';

  const view: TractorView = {
    tractor,
    currentReading,
    totalEquivHours,
    statuses,
    next,
    recommended,
    forecast: next ? (forecasts.get(next.code) ?? null) : null,
    color,
  };
  return { view, levels, counters, settings, forecasts };
}

export async function registerTractor(input: Omit<Tractor, 'id' | 'createdAt' | 'status'>): Promise<Tractor> {
  return db.tractors.insert({ ...input, status: 'active', createdAt: new Date().toISOString() });
}

export async function getTractorView(tractorId: string, today: string): Promise<TractorView> {
  return (await loadTractorState(tractorId, today)).view;
}

export async function listTractorViews(today: string): Promise<TractorView[]> {
  const tractors = await db.tractors.list();
  return Promise.all(tractors.map((t) => getTractorView(t.id, today)));
}
