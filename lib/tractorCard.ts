import type { LevelStatus } from './core/regulation';
import type { TractorView } from './services/tractors';

export type DashboardFilter = 'all' | 'ok' | 'soon' | 'overdue';

/** Daraja qoldig'i matni: "{N} soat resurs bor" / "{N} soat qoldi" / "muddati {N} soatga o'tdi". */
export function remainingText(st: Pick<LevelStatus, 'state' | 'remainingHours'>): string {
  const n = Math.abs(st.remainingHours);
  if (st.state === 'overdue') return `muddati ${n} soatga o'tdi`;
  if (st.state === 'soon') return `${n} soat qoldi`;
  return `${n} soat resurs bor`;
}

export function cardStatusLine(next: LevelStatus | null): string | null {
  return next ? `${next.name}: ${remainingText(next)}` : null;
}

export function forecastLine(forecast: { days: number; date: string } | null): string | null {
  return forecast ? `Taxminan ${forecast.days} kun (${forecast.date})` : null;
}

export function viewState(v: TractorView): 'ok' | 'soon' | 'overdue' {
  return v.color === 'red' ? 'overdue' : v.color === 'yellow' ? 'soon' : 'ok';
}

export function filterViews(views: TractorView[], filter: DashboardFilter): TractorView[] {
  return filter === 'all' ? views : views.filter((v) => viewState(v) === filter);
}

export const STATUS_COLORS = { green: '#16a34a', yellow: '#f59e0b', red: '#dc2626' } as const;
