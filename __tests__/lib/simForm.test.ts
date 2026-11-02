import { DEFAULT_OPERATION_TYPES } from '../../lib/core/defaults';
import { DEFAULT_SIM_PARAMS } from '../../lib/core/simulator';
import { t } from '../../lib/i18n/uz';
import {
  buildSimParams,
  chartScale,
  fmtCount,
  fmtDiff,
  fmtK,
  fmtMoney,
  fmtStat,
  mixSum,
  paramsToForm,
  resultRows,
} from '../../lib/simForm';

const OPS = DEFAULT_OPERATION_TYPES;

describe('simForm', () => {
  it('standart forma -> standart parametrlar (xatosiz)', () => {
    const form = paramsToForm(DEFAULT_SIM_PARAMS, OPS);
    expect(form.mix.chisel).toBe('0');
    const r = buildSimParams(form, OPS);
    expect(r.errors).toEqual({});
    expect(r.params).not.toBeNull();
    expect(r.params!.tractors).toBe(10);
    expect(r.params!.operationMix.filter((m) => m.share > 0)).toHaveLength(4);
  });

  it("vergulli son o'qiladi", () => {
    const form = { ...paramsToForm(DEFAULT_SIM_PARAMS, OPS), lambda0: '0,001' };
    expect(buildSimParams(form, OPS).params!.lambda0).toBe(0.001);
  });

  it('son emas -> maydon xatosi', () => {
    const form = { ...paramsToForm(DEFAULT_SIM_PARAMS, OPS), tractors: 'abc' };
    const r = buildSimParams(form, OPS);
    expect(r.params).toBeNull();
    expect(r.errors.tractors).toBe(t.sim.notNumber);
  });

  it('R=5000 -> runs xatosi (validateSimParams)', () => {
    const form = { ...paramsToForm(DEFAULT_SIM_PARAMS, OPS), runs: '5000' };
    const r = buildSimParams(form, OPS);
    expect(r.params).toBeNull();
    expect(r.errors.runs).toMatch(/1000/);
  });

  it("ulushlar yig'indisi 1 emas -> operationMix xatosi", () => {
    const base = paramsToForm(DEFAULT_SIM_PARAMS, OPS);
    const form = { ...base, mix: { ...base.mix, plowing: '0.5' } };
    expect(buildSimParams(form, OPS).errors.operationMix).toBeDefined();
    expect(mixSum(form.mix)).toBeCloseTo(0.5 + 0.3 + 0.2 + 0.2, 10);
  });

  it("ulush matni noto'g'ri -> operationMix xatosi", () => {
    const base = paramsToForm(DEFAULT_SIM_PARAMS, OPS);
    const form = { ...base, mix: { ...base.mix, plowing: 'x' } };
    expect(buildSimParams(form, OPS).errors.operationMix).toBeDefined();
  });

  it('formatlash', () => {
    expect(fmtK(0.91234)).toBe('0.912');
    expect(fmtCount(3.456)).toBe('3.5');
    expect(fmtMoney(12345678.9)).toBe('12 345 679');
    expect(fmtMoney(-1500000)).toBe('-1 500 000');
    expect(fmtMoney(999)).toBe('999');
  });

  it("fmtStat: o'rtacha [lo; hi]", () => {
    expect(fmtStat({ mean: 0.9, lo: 0.88, hi: 0.92 }, fmtK)).toBe('0.900 [0.880; 0.920]');
    expect(fmtStat({ mean: 2000000, lo: 1900000, hi: 2100000 }, fmtMoney)).toBe('2 000 000 [1 900 000; 2 100 000]');
  });

  it('fmtDiff: ishora bilan', () => {
    expect(fmtDiff(-1500000, fmtMoney)).toBe('-1 500 000');
    expect(fmtDiff(2.04, fmtCount)).toBe('+2.0');
    expect(fmtDiff(0, fmtCount)).toBe('0.0');
  });

  it('resultRows: 5 qator, farq = S2 - S1', () => {
    const st = (m: number) => ({ mean: m, lo: m - 1, hi: m + 1 });
    const mk = (k: number) => ({
      readiness: st(k),
      failures: st(k),
      services: st(k),
      downtimeHours: st(k),
      totalCost: st(k * 1000000),
    });
    const rows = resultRows(mk(1), mk(3));
    expect(rows.map((r) => r.label)).toEqual([
      t.sim.metrics.readiness,
      t.sim.metrics.failures,
      t.sim.metrics.services,
      t.sim.metrics.downtimeHours,
      t.sim.metrics.totalCost,
    ]);
    expect(rows[4].diff).toBe('+2 000 000');
    expect(rows[0].s1).toBe('1.000 [0.000; 2.000]');
  });

  it("chartScale: 0 chizig'i har doim ichida", () => {
    const pts = [
      { beta: 0, costDiff: { mean: -2, lo: -3, hi: -1 } },
      { beta: 1, costDiff: { mean: -1, lo: -2, hi: -0.5 } },
    ];
    const sc = chartScale(pts);
    expect(sc.max).toBeGreaterThanOrEqual(0);
    expect(sc.min).toBeLessThanOrEqual(-3);
    expect(sc.pos(sc.max)).toBeCloseTo(0, 5);
    expect(sc.pos(sc.min)).toBeCloseTo(1, 5);
    expect(sc.pos(0)).toBeGreaterThanOrEqual(0);
  });

  it("chartScale: bo'sh ro'yxat buzilmaydi", () => {
    const sc = chartScale([]);
    expect(sc.max).toBeGreaterThan(sc.min);
  });
});
