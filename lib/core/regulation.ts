import type { CoreSettings, LevelCounter, RegulationLevel } from './types';

export type LevelStatus = {
  code: string;
  name: string;
  remainingHours: number;
  state: 'ok' | 'soon' | 'overdue';
  reason: 'equiv' | 'phys' | 'calendar' | null;
};

export type ReplayEvent =
  | { type: 'reading'; date: string; physHours: number; equivHours: number }
  | { type: 'service'; date: string; levelCode: string };

const round1 = (n: number) => Math.round(n * 10) / 10;

/** 'YYYY-MM-DD' ga oy qo'shadi (oy oxiridan oshsa, oxirgi kunga qisqartiradi). */
function addMonths(date: string, months: number): string {
  const [y, m, d] = date.split('-').map(Number);
  const total = y * 12 + (m - 1) + months;
  const ny = Math.floor(total / 12);
  const nm = total % 12;
  const last = new Date(Date.UTC(ny, nm + 1, 0)).getUTCDate();
  const nd = Math.min(d, last);
  const p = (n: number, w: number) => String(n).padStart(w, '0');
  return `${p(ny, 4)}-${p(nm + 1, 2)}-${p(nd, 2)}`;
}

export function initialCounters(levels: RegulationLevel[], initialReading: number, date: string): LevelCounter[] {
  return levels.map((l) => {
    if (l.kind === 'once') {
      return { code: l.code, physSince: 0, equivSince: 0, lastServiceDate: date, done: initialReading >= l.intervalHours };
    }
    const since = initialReading % l.intervalHours;
    return { code: l.code, physSince: since, equivSince: since, lastServiceDate: date, done: false };
  });
}

export function advanceCounters(c: LevelCounter[], physHours: number, equivHours: number): LevelCounter[] {
  return c.map((x) => ({ ...x, physSince: x.physSince + physHours, equivSince: x.equivSince + equivHours }));
}

export function evaluateLevels(
  c: LevelCounter[],
  levels: RegulationLevel[],
  s: CoreSettings,
  totalReading: number,
  today: string,
): LevelStatus[] {
  const out: LevelStatus[] = [];
  for (const l of levels) {
    const cnt = c.find((x) => x.code === l.code);
    if (!cnt) continue;
    let remaining: number;
    let reason: LevelStatus['reason'] = null;
    if (l.kind === 'once') {
      if (cnt.done) continue;
      remaining = l.intervalHours - totalReading;
      if (remaining <= 0) reason = 'phys';
    } else {
      const rEquiv = l.intervalHours - cnt.equivSince;
      const rPhys = s.gamma * l.intervalHours - cnt.physSince;
      remaining = Math.min(rEquiv, rPhys);
      const calendarDue = addMonths(cnt.lastServiceDate, s.calendarMonths) <= today;
      if (calendarDue) {
        remaining = 0;
        reason = 'calendar';
      } else if (remaining <= 0) {
        reason = rEquiv <= rPhys ? 'equiv' : 'phys';
      }
    }
    const state: LevelStatus['state'] =
      remaining <= 0 ? 'overdue' : remaining <= s.dueSoonFraction * l.intervalHours ? 'soon' : 'ok';
    out.push({ code: l.code, name: l.name, remainingHours: round1(remaining), state, reason: state === 'overdue' ? reason : null });
  }
  return out;
}

export function recommendedLevel(statuses: LevelStatus[], levels: RegulationLevel[]): string | null {
  let best: RegulationLevel | null = null;
  for (const st of statuses) {
    if (st.state !== 'overdue') continue;
    const l = levels.find((x) => x.code === st.code);
    if (l && (!best || l.intervalHours > best.intervalHours)) best = l;
  }
  return best ? best.code : null;
}

export function nextDue(statuses: LevelStatus[]): LevelStatus | null {
  let best: LevelStatus | null = null;
  for (const st of statuses) if (!best || st.remainingHours < best.remainingHours) best = st;
  return best;
}

export function applyService(c: LevelCounter[], levels: RegulationLevel[], code: string, date: string): LevelCounter[] {
  const level = levels.find((l) => l.code === code);
  const reset = new Set<string>([code, ...(level?.covers ?? [])]);
  return c.map((x) => {
    if (!reset.has(x.code)) return x;
    const l = levels.find((y) => y.code === x.code);
    return { ...x, physSince: 0, equivSince: 0, lastServiceDate: date, done: l?.kind === 'once' ? true : x.done };
  });
}

export function replayCounters(
  levels: RegulationLevel[],
  initialReading: number,
  registrationDate: string,
  events: ReplayEvent[],
): LevelCounter[] {
  let c = initialCounters(levels, initialReading, registrationDate);
  for (const e of events) {
    c = e.type === 'reading' ? advanceCounters(c, e.physHours, e.equivHours) : applyService(c, levels, e.levelCode, e.date);
  }
  return c;
}
