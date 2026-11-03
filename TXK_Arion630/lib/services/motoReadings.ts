import { todayLocal } from '../core/dates';
import { equivalentHours } from '../core/loadFactor';
import type { WorkShare } from '../core/types';
import { db } from '../db';
import { enqueue, StorageError, writeJson, colKey } from '../db/storage';
import type { MotoReading } from '../db/schema';
import { refreshAlerts } from './alerts';
import { byDateThenCreated, daysBetween } from './tractors';

export type ReadingError =
  | 'not_number'
  | 'decreasing'
  | 'date_before_last'
  | 'shares_mismatch'
  | 'future_date'
  | 'over_24h_needs_confirm';

export type RecordReadingInput = {
  tractorId: string;
  date: string;
  reading: number;
  shares: WorkShare[];
  fuelLiters: number | null;
  note: string | null;
  userId: string;
  confirmOver24h?: boolean;
};

const okNum = (n: unknown) => typeof n === 'number' && Number.isFinite(n) && n >= 0;

export async function recordMotoReading(
  input: RecordReadingInput,
): Promise<{ ok: true; reading: MotoReading } | { ok: false; error: ReadingError }> {
  const fail = (error: ReadingError) => ({ ok: false as const, error });
  if (
    !okNum(input.reading) ||
    !input.shares.every((s) => okNum(s.hours)) ||
    !(input.fuelLiters === null || (Number.isFinite(input.fuelLiters) && input.fuelLiters > 0))
  ) {
    return fail('not_number');
  }
  const tractor = await db.tractors.get(input.tractorId);
  if (!tractor) throw new StorageError('Traktor topilmadi');

  const prev = byDateThenCreated((await db.motoReadings.list()).filter((r) => r.tractorId === input.tractorId));
  const last = prev.length ? prev[prev.length - 1] : null;
  const lastValue = last ? last.reading : tractor.initialReading;
  const lastDate = last ? last.date : tractor.registrationDate;

  if (input.date > todayLocal()) return fail('future_date');
  if (input.reading < lastValue) return fail('decreasing');
  if (last && input.date < last.date) return fail('date_before_last');

  const physHours = input.reading - lastValue;
  let shares = input.shares;
  if (shares.length === 1 && shares[0].hours === 0) shares = [{ ...shares[0], hours: physHours }];
  const sum = shares.reduce((s, w) => s + w.hours, 0);
  if (Math.abs(sum - physHours) > 0.01) return fail('shares_mismatch');
  if (physHours / Math.max(1, daysBetween(lastDate, input.date)) > 24 && !input.confirmOver24h) {
    return fail('over_24h_needs_confirm');
  }

  const [settings, ops] = await Promise.all([db.settings.get(), db.operationTypes.list()]);
  const useFuel = input.fuelLiters !== null && sum > 0;
  const equivHours = equivalentHours(shares, ops, settings, useFuel ? (input.fuelLiters as number) : undefined);

  const reading = await db.motoReadings.insert({
    tractorId: input.tractorId,
    date: input.date,
    reading: input.reading,
    physHours,
    shares,
    fuelLiters: input.fuelLiters,
    equivHours,
    userId: input.userId,
    note: input.note,
    createdAt: new Date().toISOString(),
  });
  await refreshAlerts(input.tractorId, input.date);
  return { ok: true, reading };
}

/** Faqat traktorning oxirgi yozuvini o'chiradi. */
export async function deleteMotoReading(id: string): Promise<void> {
  const target = await db.motoReadings.get(id);
  if (!target) throw new StorageError('Yozuv topilmadi');
  const all = byDateThenCreated((await db.motoReadings.list()).filter((r) => r.tractorId === target.tractorId));
  if (all[all.length - 1].id !== id) throw new StorageError("Faqat oxirgi yozuvni o'chirish mumkin");
  await db.motoReadings.remove(id);
  const rest = all.slice(0, -1);
  const tractor = await db.tractors.get(target.tractorId);
  const today = rest.length ? rest[rest.length - 1].date : (tractor?.registrationDate ?? target.date);
  await refreshAlerts(target.tractorId, today);
}

/**
 * Barcha yozuvlarning keltirilgan soatini joriy ish turlari/sozlamalar bilan qayta hisoblaydi.
 * O'zgargan yozuvlar sonini qaytaradi.
 */
export async function recomputeEquivalentHours(): Promise<number> {
  const changed = await enqueue(async () => {
    const [settings, ops, all] = await Promise.all([db.settings.get(), db.operationTypes.list(), db.motoReadings.list()]);
    let n = 0;
    const next = all.map((r) => {
      const sum = r.shares.reduce((s, w) => s + w.hours, 0);
      const useFuel = r.fuelLiters !== null && sum > 0;
      let eq: number;
      try {
        eq = equivalentHours(r.shares, ops, settings, useFuel ? (r.fuelLiters as number) : undefined);
      } catch {
        return r; // noma'lum ish turi: eski qiymat saqlanadi
      }
      if (Math.abs(eq - r.equivHours) < 1e-9) return r;
      n++;
      return { ...r, equivHours: eq };
    });
    if (n > 0) await writeJson(colKey('motoReadings'), next);
    return n;
  });
  const today = todayLocal();
  for (const tr of await db.tractors.list()) await refreshAlerts(tr.id, today);
  return changed;
}
