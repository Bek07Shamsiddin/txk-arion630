import { db } from '../db';
import { StorageError } from '../db/storage';
import type { ServiceRecord } from '../db/schema';
import { refreshAlerts } from './alerts';
import { currentReadingOf } from './tractors';

export async function recordService(
  input: Omit<ServiceRecord, 'id' | 'createdAt' | 'reading'>,
): Promise<ServiceRecord> {
  const levels = await db.regulation.list();
  if (!levels.some((l) => l.code === input.levelCode)) throw new StorageError("Noma'lum TXK darajasi");
  const tractor = await db.tractors.get(input.tractorId);
  if (!tractor) throw new StorageError('Traktor topilmadi');
  const readings = (await db.motoReadings.list()).filter((r) => r.tractorId === input.tractorId);
  const rec = await db.serviceRecords.insert({
    ...input,
    reading: currentReadingOf(tractor, readings),
    createdAt: new Date().toISOString(),
  });
  await refreshAlerts(input.tractorId, input.date);
  return rec;
}
