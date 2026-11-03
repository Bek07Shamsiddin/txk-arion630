import { DEFAULT_REGULATION as L, DEFAULT_SETTINGS as S } from '../../lib/core/defaults';
import {
  initialCounters,
  advanceCounters,
  evaluateLevels,
  recommendedLevel,
  nextDue,
  applyService,
  replayCounters,
  LevelStatus,
  ReplayEvent,
} from '../../lib/core/regulation';

const D0 = '2026-01-01';
const D1 = '2026-06-01';
const byCode = (st: LevelStatus[], code: string) => st.find((x) => x.code === code)!;

function readingsTo(total: number): ReplayEvent[] {
  const svc: Record<number, string[]> = { 50: ['O50'], 100: ['O100'], 250: ['T250'], 500: ['T500'], 750: ['T250'], 1000: ['T1000'] };
  const ev: ReplayEvent[] = [];
  for (let h = 50; h <= total; h += 50) {
    ev.push({ type: 'reading', date: D0, physHours: 50, equivHours: 50 });
    for (const code of svc[h] ?? []) ev.push({ type: 'service', date: D0, levelCode: code });
  }
  return ev;
}

describe('reglament', () => {
  test('245 m/s → T250 da 5 soat, soon', () => {
    const c = initialCounters(L, 245, D0);
    const st = byCode(evaluateLevels(c, L, S, 245, D0), 'T250');
    expect(st.remainingHours).toBe(5);
    expect(st.state).toBe('soon');
  });
  test('180 m/s → T250 da 70 soat, ok', () => {
    const st = byCode(evaluateLevels(initialCounters(L, 180, D0), L, S, 180, D0), 'T250');
    expect(st.remainingHours).toBe(70);
    expect(st.state).toBe('ok');
  });
  test('davriy: 1250 da T250 qayta keladi', () => {
    const c = replayCounters(L, 0, D0, readingsTo(1250));
    expect(byCode(evaluateLevels(c, L, S, 1250, D1), 'T250').state).toBe('overdue');
  });
  test('obkatka bir marta', () => {
    let c = initialCounters(L, 0, D0);
    c = advanceCounters(c, 50, 50);
    expect(byCode(evaluateLevels(c, L, S, 50, D0), 'O50').state).toBe('overdue');
    c = applyService(c, L, 'O50', D0);
    expect(evaluateLevels(c, L, S, 60, D0).find((x) => x.code === 'O50')).toBeUndefined();
  });
  test('T1000 T500 va T250 ni qamraydi', () => {
    let c = advanceCounters(initialCounters(L, 0, D0), 1000, 1000);
    c = applyService(c, L, 'T1000', D1);
    for (const k of ['T250', 'T500', 'T1000']) expect(c.find((x) => x.code === k)!.physSince).toBe(0);
  });
  test("og'ir yuklanish TXK ni oldinga suradi", () => {
    const c = advanceCounters(initialCounters(L, 0, D0), 200, 260);
    const st = byCode(evaluateLevels(c, L, S, 200, D0), 'T250');
    expect(st.state).toBe('overdue');
    expect(st.reason).toBe('equiv');
  });
  test('yengil yuklanish uzaytirmaydi (gamma=1)', () => {
    const c = advanceCounters(initialCounters(L, 0, D0), 250, 150);
    const st = byCode(evaluateLevels(c, L, S, 250, D0), 'T250');
    expect(st.state).toBe('overdue');
    expect(st.reason).toBe('phys');
  });
  test('12 oy kalendar sharti', () => {
    const st = byCode(evaluateLevels(initialCounters(L, 10, '2025-01-01'), L, S, 10, '2026-01-01'), 'T250');
    expect(st.reason).toBe('calendar');
  });
  test("1300 m/s bilan ro'yxat: obkatka yo'q, T250 qoldiq 200", () => {
    const c = initialCounters(L, 1300, D0);
    const st = evaluateLevels(c, L, S, 1300, D0);
    expect(st.find((x) => x.code === 'O50')).toBeUndefined();
    expect(byCode(st, 'T250').remainingHours).toBe(200);
    expect(byCode(st, 'T1000').remainingHours).toBe(700);
  });
  test('recommendedLevel eng yuqori overdue', () => {
    const c = advanceCounters(initialCounters(L, 0, D0), 1000, 1000);
    expect(
      recommendedLevel(evaluateLevels(applyService(applyService(c, L, 'O50', D0), L, 'O100', D0), L, S, 1000, D0), L),
    ).toBe('T1000');
  });
  test('recommendedLevel yo\'q bo\'lsa null; nextDue eng kichik qoldiq', () => {
    const st = evaluateLevels(initialCounters(L, 180, D0), L, S, 180, D0);
    expect(recommendedLevel(st, L)).toBeNull();
    expect(nextDue(st)!.remainingHours).toBe(Math.min(...st.map((x) => x.remainingHours)));
    expect(nextDue([])).toBeNull();
  });
});
