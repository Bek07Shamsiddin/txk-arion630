import { technicalReadiness, downtimeHours } from '../../lib/core/readiness';

describe('K_tt', () => {
  test('K_tt', () => expect(technicalReadiness(900, 30, 70)).toBeCloseTo(0.9, 5));
  test("K_tt bo'sh → null", () => expect(technicalReadiness(0, 0, 0)).toBeNull());
  test('bekor: 1.5 kun × 10', () =>
    expect(downtimeHours('2026-11-01T08:00:00Z', '2026-11-02T20:00:00Z', 10)).toBeCloseTo(15, 5));
});
