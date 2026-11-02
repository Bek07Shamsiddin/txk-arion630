import type { AppNotification } from './db/schema';

const COLORS: Record<AppNotification['kind'], string> = {
  service_overdue: '#dc2626',
  service_soon: '#f59e0b',
  reorder: '#3b82f6',
  mechanic: '#6b7280',
};

export const notificationColor = (kind: AppNotification['kind']): string => COLORS[kind];

export function sortNewestFirst(items: AppNotification[]): AppNotification[] {
  return [...items].sort((a, b) => (a.createdAt === b.createdAt ? 0 : a.createdAt < b.createdAt ? 1 : -1));
}

export const unreadCount = (items: AppNotification[]): number => items.filter((n) => !n.isRead).length;

/** Bosilganda ochiladigan ekran (faqat buyurtma eslatmasi). */
export function notificationHref(n: AppNotification): string | null {
  if (n.kind !== 'reorder') return null;
  const base = `/request-parts?tractorId=${encodeURIComponent(n.tractorId)}`;
  return n.levelCode ? `${base}&levelCode=${encodeURIComponent(n.levelCode)}` : base;
}
