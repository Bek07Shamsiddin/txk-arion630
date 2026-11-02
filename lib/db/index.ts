import type { CoreSettings, OperationType, RegulationLevel } from '../core/types';
import { DEFAULT_OPERATION_TYPES, DEFAULT_REGULATION, DEFAULT_SETTINGS } from '../core/defaults';
import type {
  AppNotification,
  DamageReport,
  MechanicRequest,
  MotoReading,
  PartsRequest,
  ServiceRecord,
  Tractor,
  User,
} from './schema';
import { COLLECTION_NAMES, SCHEMA_VERSION } from './schema';
import { colKey, CorruptDataError, createCollection, enqueue, readJson, writeJson } from './storage';
import { todayLocal } from '../core/dates';

export const SETTINGS_KEY = 'doc:settings';
export const VERSION_KEY = 'meta:schemaVersion';

export type StoredRegulationLevel = RegulationLevel & { id: string };

export const db = {
  users: createCollection<User>('users'),
  tractors: createCollection<Tractor>('tractors'),
  motoReadings: createCollection<MotoReading>('motoReadings'),
  serviceRecords: createCollection<ServiceRecord>('serviceRecords'),
  partsRequests: createCollection<PartsRequest>('partsRequests'),
  mechanicRequests: createCollection<MechanicRequest>('mechanicRequests'),
  damageReports: createCollection<DamageReport>('damageReports'),
  notifications: createCollection<AppNotification>('notifications'),
  operationTypes: createCollection<OperationType>('operationTypes'),
  regulation: createCollection<StoredRegulationLevel>('regulation'),
  settings: {
    async get(): Promise<CoreSettings> {
      const s = await readJson<Partial<CoreSettings>>(SETTINGS_KEY);
      return { ...DEFAULT_SETTINGS, ...(s ?? {}) };
    },
    set: (s: CoreSettings) => enqueue(() => writeJson(SETTINGS_KEY, s)),
  },
};

/** Birinchi ishga tushirishda boshlang'ich ma'lumotlarni yozadi; keyingilarida hech narsa qo'shmaydi. */
let initInFlight: Promise<void> | null = null;
export function initDb(): Promise<void> {
  if (!initInFlight) {
    initInFlight = runInit().finally(() => {
      initInFlight = null;
    });
  }
  return initInFlight;
}

async function runInit(): Promise<void> {
  const version = await readJson<number>(VERSION_KEY);
  if (version !== null) {
    // Buzilgan kolleksiya/sozlama ishga tushirishda aniqlanishi kerak (tiklash ekraniga o'tish uchun).
    for (const name of COLLECTION_NAMES) {
      const v = await readJson<unknown>(colKey(name));
      if (v !== null && !Array.isArray(v)) throw new CorruptDataError(colKey(name));
    }
    const st = await readJson<unknown>(SETTINGS_KEY);
    if (st !== null && (typeof st !== 'object' || Array.isArray(st))) throw new CorruptDataError(SETTINGS_KEY);
    // Hozircha v1 yagona sxema; kelajakda saqlangan ma'lumot migratsiyasi shu yerda.
    if (version < SCHEMA_VERSION) await enqueue(() => writeJson(VERSION_KEY, SCHEMA_VERSION));
    return;
  }
  const now = new Date().toISOString();
  await db.regulation.replaceAll(DEFAULT_REGULATION.map((r) => ({ ...r, id: r.code })));
  await db.operationTypes.replaceAll(DEFAULT_OPERATION_TYPES);
  if ((await readJson(SETTINGS_KEY)) === null) await db.settings.set(DEFAULT_SETTINGS);
  if ((await db.users.list()).length === 0) {
    await db.users.insert({ name: 'Administrator', role: 'admin', pinHash: null, active: true, createdAt: now });
  }
  if ((await db.tractors.list()).length === 0) {
    await db.tractors.insert({
      model: 'Claas Arion 630',
      serialNumber: 'NAMUNA-001',
      registrationDate: todayLocal(),
      location: '',
      operatorName: '',
      photoUri: null,
      initialReading: 0,
      status: 'active',
      createdAt: now,
    });
  }
  await enqueue(() => writeJson(VERSION_KEY, SCHEMA_VERSION));
}
