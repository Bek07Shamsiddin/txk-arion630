import { cardStatusLine, filterViews, forecastLine, remainingText } from '../../lib/tractorCard';
import { isIsoDate, todayLocal } from '../../lib/core/dates';
import type { TractorView } from '../../lib/services/tractors';

describe('tractorCard', () => {
  it('matn shablonlari', () => {
    expect(remainingText({ state: 'ok', remainingHours: 70 })).toBe('70 soat resurs bor');
    expect(remainingText({ state: 'soon', remainingHours: 5 })).toBe('5 soat qoldi');
    expect(remainingText({ state: 'overdue', remainingHours: -12.5 })).toBe("muddati 12.5 soatga o'tdi");
  });
  it('daraja nomi bilan', () => {
    const st = { code: 'TO-250', name: 'TXK-250', remainingHours: 70, state: 'ok', reason: null } as const;
    expect(cardStatusLine(st)).toBe('TXK-250: 70 soat resurs bor');
    expect(cardStatusLine(null)).toBeNull();
  });
  it('prognoz', () => {
    expect(forecastLine({ days: 14, date: '2026-11-17' })).toBe('Taxminan 14 kun (2026-11-17)');
    expect(forecastLine(null)).toBeNull();
  });
  it('filtr', () => {
    const mk = (color: TractorView['color']) => ({ color }) as TractorView;
    const vs = [mk('green'), mk('yellow'), mk('red')];
    expect(filterViews(vs, 'all')).toHaveLength(3);
    expect(filterViews(vs, 'ok')).toEqual([vs[0]]);
    expect(filterViews(vs, 'soon')).toEqual([vs[1]]);
    expect(filterViews(vs, 'overdue')).toEqual([vs[2]]);
  });
});

describe('dates', () => {
  it('todayLocal va isIsoDate', () => {
    expect(todayLocal(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(isIsoDate('2026-02-30')).toBe(false);
    expect(isIsoDate('2026-02-28')).toBe(true);
    expect(isIsoDate('26-2-28')).toBe(false);
  });
});

import { fitSize } from '../../lib/media';
describe('media.fitSize', () => {
  it('eng uzun tomon 1280', () => {
    expect(fitSize(4000, 3000)).toEqual({ width: 1280, height: 960 });
    expect(fitSize(800, 600)).toEqual({ width: 800, height: 600 });
  });
});
