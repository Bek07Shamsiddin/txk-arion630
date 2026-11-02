import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CoreSettings } from '../core/types';
import { DEFAULT_SETTINGS } from '../core/defaults';
import { db, SETTINGS_KEY, VERSION_KEY } from './index';
import { COLLECTION_NAMES, SCHEMA_VERSION, migrate } from './schema';
import type { BackupData } from './schema';
import { colKey, enqueue, StorageError } from './storage';

export type { BackupData } from './schema';

export const AUTO_BACKUP_KEY = 'backup:auto';

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
  let settings: CoreSettings | undefined;
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
  // Joriy holat avtomatik zaxiraga yoziladi, so'ng hammasi bir yo'la almashtiriladi.
  const current = JSON.stringify(await exportAll());
  await enqueue(async () => {
    try {
      await AsyncStorage.setItem(AUTO_BACKUP_KEY, current);
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

function csvCell(v: unknown): string {
  if (v === null || v === undefined) return '';
  const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
  return /[;"\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(rows: Record<string, unknown>[]): string {
  const headers: string[] = [];
  for (const r of rows) for (const k of Object.keys(r)) if (!headers.includes(k)) headers.push(k);
  const lines = [headers.map(csvCell).join(';'), ...rows.map((r) => headers.map((h) => csvCell(r[h])).join(';'))];
  return '﻿' + lines.join('\r\n');
}
