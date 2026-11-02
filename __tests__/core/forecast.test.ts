import { DEFAULT_REGULATION } from '../../lib/core/defaults';
import { dailyIntensity, forecastDue } from '../../lib/core/forecast';
import { needsReorder } from '../../lib/core/partsReorder';

const T250 = DEFAULT_REGULATION.find((l) => l.code === 'T250')!;

function days(start: string, n: number, value: number) {
  const [y, m, d] = start.split('-').map(Number);
  return Array.from({ length: n }, (_, i) => ({
    date: new Date(Date.UTC(y, m - 1, d + i)).toISOString().slice(0, 10),
    equivHours: value,
  }));
}

describe('prognoz', () => {
  test("2 kunlik ma'lumot → null", () =>
    expect(dailyIntensity([{ date: '2026-10-30', equivHours: 8 }, { date: '2026-10-31', equivHours: 8 }], '2026-11-01')).toBeNull());
  test('doimiy 8 soat → 8', () => expect(dailyIntensity(days('2026-10-20', 12, 8), '2026-11-01')).toBeCloseTo(8, 5));
  test('bugungi yozuv oynaga kirmaydi', () =>
    expect(dailyIntensity([...days('2026-10-28', 4, 8), { date: '2026-11-01', equivHours: 100 }], '2026-11-01')).toBeCloseTo(8, 5));
  test('bir kunda bir nechta yozuv yig\'iladi', () =>
    expect(dailyIntensity([{ date: '2026-10-29', equivHours: 4 }, { date: '2026-10-29', equivHours: 4 }, ...days('2026-10-30', 2, 8)], '2026-11-01')).toBeCloseTo(8, 5));
  test('245 m/s, 5 soat qoldi, 8 soat/kun → 1 kun', () =>
    expect(forecastDue(5, 8, '2026-11-02')).toEqual({ days: 1, date: '2026-11-03' }));
  test('qolgan ≤ 0 → bugun', () => expect(forecastDue(0, 8, '2026-11-02')).toEqual({ days: 0, date: '2026-11-02' }));
  test('intensivlik null/0 → null', () => {
    expect(forecastDue(5, null, '2026-11-02')).toBeNull();
    expect(forecastDue(5, 0, '2026-11-02')).toBeNull();
  });
  test('oy chegarasidan o\'tish', () => expect(forecastDue(100, 8, '2026-11-25')).toEqual({ days: 13, date: '2026-12-08' }));
});

describe('buyurtma nuqtasi', () => {
  test('9 kun ≤ 7+3', () => expect(needsReorder(T250, 70, 9, false, 3)).toBe(true));
  test("ochiq so'rov bor", () => expect(needsReorder(T250, 70, 9, true, 3)).toBe(false));
  test('11 kun > 10', () => expect(needsReorder(T250, 90, 11, false, 3)).toBe(false));
  test('qolgan ≤ 0 → true', () => expect(needsReorder(T250, 0, null, false, 3)).toBe(true));
  test('prognoz null → false', () => expect(needsReorder(T250, 50, null, false, 3)).toBe(false));
});
