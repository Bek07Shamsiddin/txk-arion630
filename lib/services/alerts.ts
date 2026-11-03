import { needsReorder } from '../core/partsReorder';
import { db } from '../db';
import type { AppNotification } from '../db/schema';
import { daysBetween, loadTractorState } from './tractors';

// Eskalatsiya: muddat intervalning shu ulushidan ko'p o'tsa yoki shuncha kundan beri bajarilmasa.
export const ESCALATION_FRACTION = 0.1;
export const ESCALATION_DAYS = 3;

const OPEN_STATUSES = new Set(['pending', 'ordered', 'in_transit']);

/** Faqat yangi yaratilgan eslatmalarni qaytaradi (dedupeKey bo'yicha takrorlanmaydi). */
export async function refreshAlerts(tractorId: string, today: string): Promise<AppNotification[]> {
  const { view, levels, counters, settings, forecasts } = await loadTractorState(tractorId, today);
  const all = await db.notifications.list();
  const existing = new Set(all.map((n) => n.dedupeKey));
  const firstSeen = new Map(all.map((n) => [n.dedupeKey, n.createdAt.slice(0, 10)]));
  const requests = (await db.partsRequests.list()).filter(
    (r) => r.tractorId === tractorId && OPEN_STATUSES.has(r.status),
  );
  const created: AppNotification[] = [];

  const push = async (kind: AppNotification['kind'], levelCode: string, message: string, dedupeKey: string) => {
    if (existing.has(dedupeKey)) return;
    existing.add(dedupeKey);
    created.push(
      await db.notifications.insert({
        tractorId,
        kind,
        levelCode,
        message,
        dedupeKey,
        isRead: false,
        createdAt: new Date().toISOString(),
      }),
    );
  };

  for (const st of view.statuses) {
    if (st.state === 'ok') continue;
    const counter = counters.find((c) => c.code === st.code)!;
    const key = `${tractorId}:${st.code}:${st.state}:${counter.lastServiceDate}`;
    if (st.state === 'soon') {
      await push('service_soon', st.code, `${st.name}: ${st.remainingHours} soat qoldi`, key);
    } else if (st.reason === 'calendar') {
      await push('service_overdue', st.code, `${st.name}: ${settings.calendarMonths} oydan beri bajarilmagan`, key);
    } else {
      await push('service_overdue', st.code, `${st.name}: muddati ${Math.abs(st.remainingHours)} soatga o'tdi`, key);
    }
    if (st.state !== 'overdue') continue;
    // TXK bajarilmadi → har kuni bitta eslatma; chegaradan oshsa → eskalatsiya (sikl uchun bir marta).
    const since = firstSeen.get(key) ?? today;
    const days = daysBetween(since, today);
    const over = Math.abs(st.remainingHours);
    if (days >= 1) {
      await push('service_reminder', st.code, `${st.name}: TXK hali bajarilmagan (${days} kun)`, `${key}:rem:${today}`);
    }
    const level = levels.find((l) => l.code === st.code)!;
    if (over >= ESCALATION_FRACTION * level.intervalHours || days >= ESCALATION_DAYS) {
      await push('escalation', st.code, `ESKALATSIYA — ${st.name}: muddati ${over} soatga o'tdi, ${days} kundan beri bajarilmagan`, `${key}:esc`);
    }
  }

  for (const st of view.statuses) {
    const level = levels.find((l) => l.code === st.code)!;
    const counter = counters.find((c) => c.code === st.code)!;
    const f = forecasts.get(st.code) ?? null;
    const hasOpen = requests.some((r) => r.levelCode === st.code);
    if (needsReorder(level, st.remainingHours, f ? f.days : null, hasOpen, settings.reorderBufferDays)) {
      await push(
        'reorder',
        st.code,
        `${st.name} uchun ehtiyot qismlarni buyurtma qiling (≈${f ? f.days : 0} kun qoldi)`,
        `${tractorId}:${st.code}:reorder:${counter.lastServiceDate}`,
      );
    }
  }
  return created;
}
