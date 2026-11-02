import { readingErrorMessage, sharesSum, buildShares, physHoursPreview } from '../../lib/motoForm';
import { prefillParts, parseUsedParts } from '../../lib/serviceForm';
import { notificationColor, notificationHref, sortNewestFirst, unreadCount } from '../../lib/notificationView';
import { t } from '../../lib/i18n/uz';
import type { AppNotification } from '../../lib/db/schema';

describe('motoForm', () => {
  it('har bir ReadingError uchun xabar', () => {
    for (const k of ['not_number', 'decreasing', 'date_before_last', 'shares_mismatch', 'over_24h_needs_confirm'] as const) {
      expect(readingErrorMessage(k)).toBe(t.hours.readingErrors[k]);
      expect(readingErrorMessage(k).length).toBeGreaterThan(5);
    }
  });
  it('sharesSum vergulli sonlar va noto\'g\'ri qatorlar', () => {
    expect(sharesSum([{ operationTypeId: 'a', hours: '3,5' }, { operationTypeId: 'b', hours: '2' }])).toBe(5.5);
    expect(sharesSum([{ operationTypeId: 'a', hours: 'x' }])).toBe(0);
  });
  it('buildShares: bitta qator bo\'sh soat -> 0 (xizmat avtomatik)', () => {
    expect(buildShares([{ operationTypeId: 'a', hours: '' }])).toEqual([{ operationTypeId: 'a', hours: 0 }]);
    expect(buildShares([{ operationTypeId: 'a', hours: '4,5' }, { operationTypeId: 'b', hours: '1' }])).toEqual([
      { operationTypeId: 'a', hours: 4.5 },
      { operationTypeId: 'b', hours: 1 },
    ]);
  });
  it('buildShares: yaroqsiz -> null', () => {
    expect(buildShares([])).toBeNull();
    expect(buildShares([{ operationTypeId: '', hours: '1' }])).toBeNull();
    expect(buildShares([{ operationTypeId: 'a', hours: '1' }, { operationTypeId: 'b', hours: '' }])).toBeNull();
    expect(buildShares([{ operationTypeId: 'a', hours: '-1' }, { operationTypeId: 'b', hours: '1' }])).toBeNull();
  });
  it('physHoursPreview', () => {
    expect(physHoursPreview('245', 200)).toBe(45);
    expect(physHoursPreview('245,5', 200)).toBe(45.5);
    expect(physHoursPreview('abc', 200)).toBeNull();
    expect(physHoursPreview('150', 200)).toBeNull();
  });
});

describe('serviceForm', () => {
  it('prefillParts', () => {
    const level = { parts: [{ name: 'Moy', quantity: 2, leadDays: 7 }] } as any;
    expect(prefillParts(level)).toEqual([{ name: 'Moy', quantity: '2' }]);
    expect(prefillParts(undefined)).toEqual([]);
  });
  it('parseUsedParts', () => {
    expect(parseUsedParts([{ name: ' Moy ', quantity: '2,5' }])).toEqual([{ name: 'Moy', quantity: 2.5 }]);
    expect(parseUsedParts([{ name: '', quantity: '' }])).toEqual([]);
    expect(parseUsedParts([{ name: 'Moy', quantity: '0' }])).toBeNull();
    expect(parseUsedParts([{ name: 'Moy', quantity: 'x' }])).toBeNull();
    expect(parseUsedParts([{ name: '', quantity: '3' }])).toBeNull();
  });
});

describe('notificationView', () => {
  const mk = (id: string, createdAt: string, over: Partial<AppNotification> = {}): AppNotification => ({
    id, tractorId: 'tr', kind: 'service_soon', levelCode: 'TO-1', message: 'm', dedupeKey: id,
    isRead: false, createdAt, ...over,
  });
  it('rang turi bo\'yicha', () => {
    expect(notificationColor('service_overdue')).toBe('#dc2626');
    expect(notificationColor('service_soon')).toBe('#f59e0b');
    expect(notificationColor('reorder')).toBe('#3b82f6');
    expect(notificationColor('mechanic')).toBe('#6b7280');
  });
  it('yangisi birinchi', () => {
    const a = mk('a', '2026-01-01T00:00:00Z');
    const b = mk('b', '2026-02-01T00:00:00Z');
    expect(sortNewestFirst([a, b]).map((n) => n.id)).toEqual(['b', 'a']);
  });
  it('havola', () => {
    expect(notificationHref(mk('a', 'x', { kind: 'reorder' }))).toBe('/request-parts?tractorId=tr&levelCode=TO-1');
    expect(notificationHref(mk('a', 'x', { kind: 'reorder', levelCode: null }))).toBe('/request-parts?tractorId=tr');
    expect(notificationHref(mk('a', 'x'))).toBeNull();
  });
  it('unreadCount', () => {
    expect(unreadCount([mk('a', 'x'), mk('b', 'y', { isRead: true })])).toBe(1);
  });
});
