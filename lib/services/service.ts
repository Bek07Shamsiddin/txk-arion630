import { todayLocal } from '../core/dates';
import { db } from '../db';
import { StorageError } from '../db/storage';
import type { ServiceRecord } from '../db/schema';
import { t } from '../i18n/uz';
import { refreshAlerts } from './alerts';
import { byDateThenCreated, currentReadingOf } from './tractors';

export async function recordService(
  input: Omit<ServiceRecord, 'id' | 'createdAt' | 'reading'>,
): Promise<ServiceRecord> {
  const levels = await db.regulation.list();
  if (!levels.some((l) => l.code === input.levelCode)) throw new StorageError(t.service.unknownLevelError);
  const tractor = await db.tractors.get(input.tractorId);
  if (!tractor) throw new StorageError(t.service.tractorNotFound);
  if (input.date > todayLocal()) throw new StorageError(t.service.futureDate);
  if (input.date < tractor.registrationDate) throw new StorageError(t.service.dateBeforeRegistration);
  const readings = (await db.motoReadings.list()).filter((r) => r.tractorId === input.tractorId);
  const rec = await db.serviceRecords.insert({
    ...input,
    reading: currentReadingOf(tractor, readings),
    createdAt: new Date().toISOString(),
  });
  await refreshAlerts(input.tractorId, input.date);
  return rec;
}

/** Faqat traktorning oxirgi (sana, yaratilgan vaqti bo'yicha) TXK yozuvini o'chiradi. */
export async function deleteServiceRecord(id: string): Promise<void> {
  const target = await db.serviceRecords.get(id);
  if (!target) throw new StorageError(t.service.recordNotFound);
  const all = byDateThenCreated((await db.serviceRecords.list()).filter((r) => r.tractorId === target.tractorId));
  if (all[all.length - 1].id !== id) throw new StorageError(t.service.onlyLatestDeletable);
  await db.serviceRecords.remove(id);
  await refreshAlerts(target.tractorId, todayLocal());
}
