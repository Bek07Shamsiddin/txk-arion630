import { DEFAULT_OPERATION_TYPES, DEFAULT_REGULATION, DEFAULT_SETTINGS } from '../../lib/core/defaults';
import { loadFactor } from '../../lib/core/loadFactor';
import { t } from '../../lib/i18n/uz';
import {
  buildLevelEdit,
  buildOpTypeEdit,
  buildSettings,
  levelToForm,
  newOpTypeError,
  opTypeDeleteGuard,
  previewK,
  settingsToForm,
} from '../../lib/regulationForm';

describe('settings', () => {
  const ok = settingsToForm(DEFAULT_SETTINGS);
  it('standart sozlamalar xatosiz', () => {
    const r = buildSettings(ok, DEFAULT_SETTINGS);
    expect(r.errors).toEqual({});
    expect(r.value).toEqual(DEFAULT_SETTINGS);
  });
  it('nominalFuelLph > 0', () => {
    expect(buildSettings({ ...ok, nominalFuelLph: '0' }, DEFAULT_SETTINGS).errors.nominalFuelLph).toBe(t.regAdmin.nominalInvalid);
    expect(buildSettings({ ...ok, nominalFuelLph: 'x' }, DEFAULT_SETTINGS).errors.nominalFuelLph).toBe(t.regAdmin.notNumber);
  });
  it('gamma [0.8; 1.0]', () => {
    expect(buildSettings({ ...ok, gamma: '0.79' }, DEFAULT_SETTINGS).errors.gamma).toBe(t.regAdmin.gammaInvalid);
    expect(buildSettings({ ...ok, gamma: '1.01' }, DEFAULT_SETTINGS).errors.gamma).toBe(t.regAdmin.gammaInvalid);
    expect(buildSettings({ ...ok, gamma: '0,8' }, DEFAULT_SETTINGS).errors.gamma).toBeUndefined();
    expect(buildSettings({ ...ok, gamma: '1' }, DEFAULT_SETTINGS).errors.gamma).toBeUndefined();
  });
  it('reorderBufferDays butun >= 0', () => {
    expect(buildSettings({ ...ok, reorderBufferDays: '-1' }, DEFAULT_SETTINGS).errors.reorderBufferDays).toBe(t.regAdmin.bufferInvalid);
    expect(buildSettings({ ...ok, reorderBufferDays: '2.5' }, DEFAULT_SETTINGS).errors.reorderBufferDays).toBe(t.regAdmin.bufferInvalid);
    expect(buildSettings({ ...ok, reorderBufferDays: '0' }, DEFAULT_SETTINGS).errors.reorderBufferDays).toBeUndefined();
  });
  it('shiftHoursPerDay (0; 24]', () => {
    expect(buildSettings({ ...ok, shiftHoursPerDay: '0' }, DEFAULT_SETTINGS).errors.shiftHoursPerDay).toBe(t.regAdmin.shiftInvalid);
    expect(buildSettings({ ...ok, shiftHoursPerDay: '24.5' }, DEFAULT_SETTINGS).errors.shiftHoursPerDay).toBe(t.regAdmin.shiftInvalid);
    expect(buildSettings({ ...ok, shiftHoursPerDay: '24' }, DEFAULT_SETTINGS).errors.shiftHoursPerDay).toBeUndefined();
  });
  it('boshqa maydonlar (kMin/kMax) saqlanadi', () => {
    const r = buildSettings({ ...ok, gamma: '0.9' }, { ...DEFAULT_SETTINGS, kMax: 3 });
    expect(r.value!.kMax).toBe(3);
    expect(r.value!.gamma).toBe(0.9);
  });
});

describe('level edit', () => {
  const level = DEFAULT_REGULATION[2]; // T250
  it("o'zgarishsiz -> xatosiz, code/kind/covers saqlanadi", () => {
    const r = buildLevelEdit(levelToForm(level), level);
    expect(r.errors).toEqual({});
    expect(r.value).toEqual(level);
  });
  it('interval va davomiylik > 0', () => {
    const f = { ...levelToForm(level), intervalHours: '0', durationHours: '-1' };
    const r = buildLevelEdit(f, level);
    expect(r.value).toBeNull();
    expect(r.errors.intervalHours).toBe(t.regAdmin.positive);
    expect(r.errors.durationHours).toBe(t.regAdmin.positive);
  });
  it('qism qatori xatolari', () => {
    const f = levelToForm(level);
    f.parts[0] = { name: ' ', quantity: '0', leadDays: '-2' };
    const r = buildLevelEdit(f, level);
    expect(r.errors['parts.0.name']).toBe(t.regAdmin.partNameRequired);
    expect(r.errors['parts.0.quantity']).toBe(t.regAdmin.posInt);
    expect(r.errors['parts.0.leadDays']).toBe(t.regAdmin.nonNegInt);
  });
  it("qismlarni qo'shish/olib tashlash mumkin", () => {
    const f = levelToForm(level);
    f.parts = [...f.parts, { name: 'Prokladka', quantity: '2', leadDays: '5' }];
    expect(buildLevelEdit(f, level).value!.parts).toHaveLength(3);
    f.parts = [];
    expect(buildLevelEdit(f, level).value!.parts).toEqual([]);
  });
});

describe('op type', () => {
  it('fuelLph > 0, nom bor', () => {
    const op = DEFAULT_OPERATION_TYPES[0];
    expect(buildOpTypeEdit({ name: op.name, fuelLph: '0', source: 'x', verified: true }, op).errors.fuelLph).toBe(t.regAdmin.positive);
    expect(buildOpTypeEdit({ name: ' ', fuelLph: '20', source: 'x', verified: true }, op).errors.name).toBe(t.regAdmin.opNameRequired);
    const r = buildOpTypeEdit({ name: op.name, fuelLph: '20,5', source: 'GOST', verified: true }, op);
    expect(r.value).toEqual({ ...op, fuelLph: 20.5, source: 'GOST', verified: true });
  });
  it('yangi id tekshiruvi', () => {
    const ops = DEFAULT_OPERATION_TYPES;
    expect(newOpTypeError('harrowing', ops)).toBeNull();
    expect(newOpTypeError('Harrowing', ops)).toBe(t.regAdmin.opIdInvalid);
    expect(newOpTypeError('1abc', ops)).toBe(t.regAdmin.opIdInvalid);
    expect(newOpTypeError('', ops)).toBe(t.regAdmin.opIdInvalid);
    expect(newOpTypeError('plowing', ops)).toBe(t.regAdmin.opIdTaken);
  });
  it("o'chirish himoyasi: moto yozuvlarida ishlatilgan tur", () => {
    const readings = [{ shares: [{ operationTypeId: 'plowing', hours: 3 }] }, { shares: [] }];
    expect(opTypeDeleteGuard('plowing', readings)).toEqual({ ok: false, count: 1 });
    expect(opTypeDeleteGuard('sowing', readings)).toEqual({ ok: true, count: 0 });
  });
  it('previewK: jonli K, cheklangan', () => {
    const op = DEFAULT_OPERATION_TYPES[0];
    expect(previewK('24', DEFAULT_SETTINGS)).toBeCloseTo(loadFactor({ ...op, fuelLph: 24 }, DEFAULT_SETTINGS), 10);
    expect(previewK('1000', DEFAULT_SETTINGS)).toBe(DEFAULT_SETTINGS.kMax);
    expect(previewK('0,1', DEFAULT_SETTINGS)).toBe(DEFAULT_SETTINGS.kMin);
    expect(previewK('abc', DEFAULT_SETTINGS)).toBeNull();
    expect(previewK('10', { ...DEFAULT_SETTINGS, nominalFuelLph: 0 })).toBeNull();
  });
});
