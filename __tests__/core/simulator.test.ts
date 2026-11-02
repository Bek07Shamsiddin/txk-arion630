import { DEFAULT_OPERATION_TYPES, DEFAULT_SETTINGS } from '../../lib/core/defaults';
import { mulberry32 } from '../../lib/core/rng';
import { DEFAULT_SIM_PARAMS, sensitivity, simulate, validateSimParams } from '../../lib/core/simulator';

const OPS = DEFAULT_OPERATION_TYPES;
const S = DEFAULT_SETTINGS;
const P = { ...DEFAULT_SIM_PARAMS, runs: 20 };

test('mulberry32 deterministik', () => { const a = mulberry32(1), b = mulberry32(1); expect([a(),a()]).toEqual([b(),b()]); });
test('bir xil seed → bir xil natija', async () => expect(await simulate(P, OPS, S)).toEqual(await simulate(P, OPS, S)));
test('og\'ir mix: S2 TXK soni ≥ S1', async () => { const r = await simulate({ ...P, operationMix: [{ operationTypeId: 'plowing', share: 1 }] }, OPS, S); expect(r.s2.services.mean).toBeGreaterThanOrEqual(r.s1.services.mean); });
test('lambda0=0 → nosozlik 0', async () => { const r = await simulate({ ...P, lambda0: 0 }, OPS, S); expect(r.s1.failures.mean).toBe(0); expect(r.s2.failures.mean).toBe(0); });
test('readiness 0..1', async () => { const r = await simulate(P, OPS, S); for (const x of [r.s1, r.s2]) { expect(x.readiness.mean).toBeGreaterThan(0); expect(x.readiness.mean).toBeLessThanOrEqual(1); } });
test('sensitivity 5 nuqta', async () => expect((await sensitivity({ ...P, runs: 10 }, OPS, S)).map(x => x.beta)).toEqual([0, 0.25, 0.5, 0.75, 1]));
test('chegaralar', () => { const e = validateSimParams({ ...P, tractors: 0, runs: 5000, seasonDays: 400, dailyHoursMax: 30 }); expect(Object.keys(e).sort()).toEqual(['dailyHoursMax', 'runs', 'seasonDays', 'tractors']); });
test('mix ulushlari yig\'indisi 1 bo\'lishi kerak', () => expect(validateSimParams({ ...P, operationMix: [{ operationTypeId: 'plowing', share: 0.5 }] })).toHaveProperty('operationMix'));
test("yengil mix (transport): S2 qismlarni oldindan buyuradi → TXK soni S1 dan ko'p", async () => { const r = await simulate({ ...P, operationMix: [{ operationTypeId: 'transport', share: 1 }] }, OPS, S); expect(r.s2.services.mean).toBeGreaterThan(r.s1.services.mean); });
test('butun son maydonlari', () => { const e = validateSimParams({ ...P, tractors: 1.5, seasonDays: 10.5, runs: 2.5, leadDays: 0.5, repairDays: 1.5 }); expect(Object.keys(e).sort()).toEqual(['leadDays', 'repairDays', 'runs', 'seasonDays', 'tractors']); });
