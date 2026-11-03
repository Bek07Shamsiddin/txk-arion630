import type { CoreSettings, OperationType, WorkShare } from './types';

const clamp = (k: number, s: CoreSettings) => Math.min(s.kMax, Math.max(s.kMin, k));

/** Ish turi koeffitsienti K = G / G_nom, [kMin, kMax] ga cheklangan. */
export function loadFactor(op: OperationType, s: CoreSettings): number {
  return clamp(op.fuelLph / s.nominalFuelLph, s);
}

/** Haqiqiy sarf bo'yicha K = (V / t) / G_nom, [kMin, kMax] ga cheklangan. */
export function fuelLoadFactor(fuelLiters: number, hours: number, s: CoreSettings): number {
  if (!(hours > 0)) throw new Error("Soat noldan katta bo'lishi kerak");
  return clamp(fuelLiters / hours / s.nominalFuelLph, s);
}

/** Keltirilgan moto-soat T_ekv = Σ tᵢ·Kᵢ; yoqilg'i berilsa jadval o'rniga undan foydalaniladi. */
export function equivalentHours(
  shares: WorkShare[],
  ops: OperationType[],
  s: CoreSettings,
  fuelLiters?: number,
): number {
  const total = shares.reduce((sum, w) => sum + w.hours, 0);
  if (fuelLiters !== undefined) {
    return total * fuelLoadFactor(fuelLiters, total, s);
  }
  return shares.reduce((sum, w) => {
    const op = ops.find((o) => o.id === w.operationTypeId);
    if (!op) throw new Error(`Noma'lum ish turi: ${w.operationTypeId}`);
    return sum + w.hours * loadFactor(op, s);
  }, 0);
}
