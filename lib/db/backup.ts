import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CoreSettings } from '../core/types';
import { DEFAULT_SETTINGS } from '../core/defaults';
import { db, SETTINGS_KEY, VERSION_KEY } from './index';
import { COLLECTION_NAMES, SCHEMA_VERSION, migrate } from './schema';
import type { BackupData } from './schema';
import { colKey, enqueue, StorageError } from './storage';

export type { BackupData } from './schema';

export const AUTO_BACKUP_KEY = 'backup:auto';
export const LAST_EXPORT_KEY = 'meta:lastExportAt';

/** Oxirgi muvaffaqiyatli eksport vaqti (ISO) yoki null. */
export async function getLastExportAt(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(LAST_EXPORT_KEY);
  } catch {
    return null;
  }
}

export async function markExported(): Promise<void> {
  try {
    await AsyncStorage.setItem(LAST_EXPORT_KEY, new Date().toISOString());
  } catch {
    // sana yozilmasa ham eksportning o'zi muvaffaqiyatli
  }
}

export class ImportError extends Error {
  constructor(message = "Zaxira fayli noto'g'ri yoki mos emas") {
    super(message);
    this.name = 'ImportError';
  }
}

export async function exportAll(): Promise<BackupData> {
  const collections: Record<string, unknown[]> = {};
  for (const name of COLLECTION_NAMES) collections[name] = await db[name].list();
  return {
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    collections,
    settings: await db.settings.get(),
  };
}

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

function parseAndValidate(json: string): BackupData {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    throw new ImportError();
  }
  if (!isObj(raw) || !isObj(raw.collections)) throw new ImportError();
  const v = raw.schemaVersion;
  const version = v === undefined ? 0 : v;
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 0 || version > SCHEMA_VERSION) {
    throw new ImportError();
  }
  const cols: Record<string, unknown[]> = {};
  for (const name of COLLECTION_NAMES) {
    const items = raw.collections[name];
    if (!Array.isArray(items) || !items.every((x) => isObj(x) && typeof x.id === 'string')) {
      throw new ImportError();
    }
    cols[name] = items;
  }
  let settings: CoreSettings = { ...DEFAULT_SETTINGS };
  if (raw.settings !== undefined) {
    if (!isObj(raw.settings)) throw new ImportError();
    for (const k of Object.keys(DEFAULT_SETTINGS)) {
      if (typeof raw.settings[k] !== 'number') throw new ImportError();
    }
    settings = raw.settings as unknown as CoreSettings;
  }
  const data = {
    schemaVersion: version,
    exportedAt: typeof raw.exportedAt === 'string' ? raw.exportedAt : new Date().toISOString(),
    collections: cols,
    settings,
  } as BackupData;
  return migrate(data, version);
}

export async function importAll(json: string): Promise<void> {
  const data = parseAndValidate(json);
  await enqueue(async () => {
    try {
      // Joriy holat xom satrlar sifatida (buzilgan kalitlar ham o'zgarishsiz) saqlanadi.
      const keys = [...COLLECTION_NAMES.map(colKey), SETTINGS_KEY, VERSION_KEY];
      const raw: Record<string, string | null> = {};
      for (const [k, v] of await AsyncStorage.multiGet(keys)) raw[k] = v;
      await AsyncStorage.setItem(AUTO_BACKUP_KEY, JSON.stringify({ savedAt: new Date().toISOString(), raw }));
      const pairs: [string, string][] = COLLECTION_NAMES.map((n) => [
        colKey(n),
        JSON.stringify(data.collections[n]),
      ]);
      pairs.push([SETTINGS_KEY, JSON.stringify(data.settings)]);
      pairs.push([VERSION_KEY, JSON.stringify(SCHEMA_VERSION)]);
      await AsyncStorage.multiSet(pairs);
    } catch {
      throw new StorageError();
    }
  });
}

type AutoBackup = { savedAt: string; raw: Record<string, string | null> };

async function readAutoBackup(): Promise<AutoBackup> {
  const none = () => new ImportError("Avtomatik zaxira topilmadi");
  const text = await AsyncStorage.getItem(AUTO_BACKUP_KEY);
  if (text === null) throw none();
  let v: unknown;
  try {
    v = JSON.parse(text);
  } catch {
    throw new ImportError("Avtomatik zaxira buzilgan");
  }
  if (!isObj(v) || typeof v.savedAt !== 'string' || !isObj(v.raw)) {
    throw new ImportError("Avtomatik zaxira buzilgan");
  }
  const raw: Record<string, string | null> = {};
  for (const [k, val] of Object.entries(v.raw)) {
    if (val !== null && typeof val !== 'string') throw new ImportError("Avtomatik zaxira buzilgan");
    raw[k] = val;
  }
  return { savedAt: v.savedAt, raw };
}

/** Avtomatik zaxira mavjud bo'lsa, uning sanasini qaytaradi. */
export async function getAutoBackupInfo(): Promise<{ savedAt: string } | null> {
  try {
    return { savedAt: (await readAutoBackup()).savedAt };
  } catch {
    return null;
  }
}

/** Oxirgi import oldidagi holatni (xom satrlar, buzilganlari ham) aynan qaytaradi. Yangi auto-zaxira yaratmaydi. */
export async function restoreAutoBackup(): Promise<void> {
  await enqueue(async () => {
    const { raw } = await readAutoBackup();
    try {
      const sets: [string, string][] = [];
      const removes: string[] = [];
      for (const [k, v] of Object.entries(raw)) {
        if (v === null) removes.push(k);
        else sets.push([k, v]);
      }
      if (sets.length) await AsyncStorage.multiSet(sets);
      if (removes.length) await AsyncStorage.multiRemove(removes);
    } catch {
      throw new StorageError();
    }
  });
}

function csvCell(v: unknown): string {
  if (v === null || v === undefined) return '';
  const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
  return /[;"\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(rows: Record<string, unknown>[]): string {
  const headers: string[] = [];
  for (const r of rows) for (const k of Object.keys(r)) if (!headers.includes(k)) headers.push(k);
  const lines = [headers.map(csvCell).join(';'), ...rows.map((r) => headers.map((h) => csvCell(r[h])).join(';'))];
  return '\uFEFF' + lines.join('\r\n');
}
