import { loadFactor } from './core/loadFactor';
import { parseDecimal } from './core/numbers';
import type { CoreSettings, OperationType, PartSpec, RegulationLevel, WorkShare } from './core/types';
import { t } from './i18n/uz';

type Result<T> = { value: T | null; errors: Record<string, string> };
const finish = <T>(errors: Record<string, string>, value: T): Result<T> =>
  Object.keys(errors).length === 0 ? { value, errors } : { value: null, errors };

// ---- Sozlamalar ----

export type SettingsForm = { nominalFuelLph: string; gamma: string; reorderBufferDays: string; shiftHoursPerDay: string };

export function settingsToForm(s: CoreSettings): SettingsForm {
  return {
    nominalFuelLph: String(s.nominalFuelLph),
    gamma: String(s.gamma),
    reorderBufferDays: String(s.reorderBufferDays),
    shiftHoursPerDay: String(s.shiftHoursPerDay),
  };
}

/** nominalFuelLph > 0, gamma [0.8; 1.0], reorderBufferDays butun >= 0, shiftHoursPerDay (0; 24]. */
export function buildSettings(form: SettingsForm, base: CoreSettings): Result<CoreSettings> {
  const errors: Record<string, string> = {};
  const num = (key: keyof SettingsForm): number | null => {
    const v = parseDecimal(form[key]);
    if (v === null) errors[key] = t.regAdmin.notNumber;
    return v;
  };
  const nominal = num('nominalFuelLph');
  const gamma = num('gamma');
  const buffer = num('reorderBufferDays');
  const shift = num('shiftHoursPerDay');
  if (nominal !== null && !(nominal > 0)) errors.nominalFuelLph = t.regAdmin.nominalInvalid;
  if (gamma !== null && !(gamma >= 0.8 && gamma <= 1)) errors.gamma = t.regAdmin.gammaInvalid;
  if (buffer !== null && !(Number.isInteger(buffer) && buffer >= 0)) errors.reorderBufferDays = t.regAdmin.bufferInvalid;
  if (shift !== null && !(shift > 0 && shift <= 24)) errors.shiftHoursPerDay = t.regAdmin.shiftInvalid;
  return finish(errors, {
    ...base,
    nominalFuelLph: nominal as number,
    gamma: gamma as number,
    reorderBufferDays: buffer as number,
    shiftHoursPerDay: shift as number,
  });
}

// ---- Reglament darajasi ----

export type PartForm = { name: string; quantity: string; leadDays: string };
export type LevelForm = { intervalHours: string; durationHours: string; parts: PartForm[] };

export function levelToForm(l: RegulationLevel): LevelForm {
  return {
    intervalHours: String(l.intervalHours),
    durationHours: String(l.durationHours),
    parts: l.parts.map((p) => ({ name: p.name, quantity: String(p.quantity), leadDays: String(p.leadDays) })),
  };
}

/** Faqat interval, davomiylik va qismlar o'zgaradi; code/kind/covers (va id) saqlanadi. */
export function buildLevelEdit<L extends RegulationLevel>(form: LevelForm, level: L): Result<L> {
  const errors: Record<string, string> = {};
  const positive = (key: 'intervalHours' | 'durationHours'): number => {
    const v = parseDecimal(form[key]);
    if (v === null) errors[key] = t.regAdmin.notNumber;
    else if (!(v > 0)) errors[key] = t.regAdmin.positive;
    return v as number;
  };
  const intervalHours = positive('intervalHours');
  const durationHours = positive('durationHours');
  const parts: PartSpec[] = form.parts.map((p, i) => {
    const name = p.name.trim();
    if (name === '') errors[`parts.${i}.name`] = t.regAdmin.partNameRequired;
    const q = parseDecimal(p.quantity);
    if (q === null) errors[`parts.${i}.quantity`] = t.regAdmin.notNumber;
    else if (!(Number.isInteger(q) && q >= 1)) errors[`parts.${i}.quantity`] = t.regAdmin.posInt;
    const d = parseDecimal(p.leadDays);
    if (d === null) errors[`parts.${i}.leadDays`] = t.regAdmin.notNumber;
    else if (!(Number.isInteger(d) && d >= 0)) errors[`parts.${i}.leadDays`] = t.regAdmin.nonNegInt;
    return { name, quantity: q as number, leadDays: d as number };
  });
  return finish(errors, { ...level, intervalHours, durationHours, parts });
}

// ---- Ish turlari ----

export type OpTypeForm = { name: string; fuelLph: string; source: string; verified: boolean };

export function opTypeToForm(op: OperationType): OpTypeForm {
  return { name: op.name, fuelLph: String(op.fuelLph), source: op.source, verified: op.verified };
}

export function buildOpTypeEdit(form: OpTypeForm, op: OperationType): Result<OperationType> {
  const errors: Record<string, string> = {};
  const name = form.name.trim();
  if (name === '') errors.name = t.regAdmin.opNameRequired;
  const g = parseDecimal(form.fuelLph);
  if (g === null) errors.fuelLph = t.regAdmin.notNumber;
  else if (!(g > 0)) errors.fuelLph = t.regAdmin.positive;
  return finish(errors, { ...op, name, fuelLph: g as number, source: form.source.trim(), verified: form.verified });
}

/** Yangi ish turi identifikatori: lotin slug, takrorlanmas. Xato bo'lmasa null. */
export function newOpTypeError(id: string, existing: OperationType[]): string | null {
  if (!/^[a-z][a-z0-9_]*$/.test(id)) return t.regAdmin.opIdInvalid;
  if (existing.some((o) => o.id === id)) return t.regAdmin.opIdTaken;
  return null;
}

/** Moto yozuvlari ish turiga havola qilsa o'chirib bo'lmaydi. */
export function opTypeDeleteGuard(
  id: string,
  readings: { shares: WorkShare[] }[],
): { ok: boolean; count: number } {
  const count = readings.filter((r) => r.shares.some((s) => s.operationTypeId === id)).length;
  return { ok: count === 0, count };
}

/** Jonli K = G / G_nom ([kMin, kMax] ga cheklangan); kiritish yaroqsiz bo'lsa null. */
export function previewK(fuelText: string, s: CoreSettings): number | null {
  const g = parseDecimal(fuelText);
  if (g === null || !(g > 0) || !(s.nominalFuelLph > 0)) return null;
  return loadFactor({ id: '', name: '', source: '', verified: false, fuelLph: g }, s);
}
