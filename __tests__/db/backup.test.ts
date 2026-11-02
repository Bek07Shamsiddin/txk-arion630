import AsyncStorage from '@react-native-async-storage/async-storage';
import { db, initDb } from '../../lib/db';
import { exportAll, importAll, toCsv, ImportError } from '../../lib/db/backup';
import { DEFAULT_SETTINGS } from '../../lib/core/defaults';

beforeEach(async () => {
  await AsyncStorage.clear();
  await initDb();
});

describe('backup', () => {
  it('exportAll -> importAll aylanmasi teng', async () => {
    const a = await exportAll();
    await importAll(JSON.stringify(a));
    const b = await exportAll();
    expect({ ...b, exportedAt: '' }).toEqual({ ...a, exportedAt: '' });
  });

  it('noto\'g\'ri fayl -> ImportError, ma\'lumot o\'zgarmaydi', async () => {
    const before = await db.tractors.list();
    await expect(importAll('{"foo":1}')).rejects.toBeInstanceOf(ImportError);
    await expect(importAll('buzuq')).rejects.toBeInstanceOf(ImportError);
    expect(await db.tractors.list()).toEqual(before);
    expect(before).toHaveLength(1);
  });

  it('kelajak schemaVersion rad etiladi', async () => {
    const a = await exportAll();
    await expect(importAll(JSON.stringify({ ...a, schemaVersion: 2 }))).rejects.toBeInstanceOf(ImportError);
  });

  it('schemaVersion yo\'q (v0) migrate orqali qabul', async () => {
    const a = await exportAll();
    const { schemaVersion, settings, ...v0 } = a;
    await importAll(JSON.stringify(v0));
    expect(await db.settings.get()).toEqual(DEFAULT_SETTINGS);
    expect(await db.tractors.list()).toHaveLength(1);
  });

  it('import oldin backup:auto yoziladi', async () => {
    const a = await exportAll();
    await importAll(JSON.stringify(a));
    const raw = await AsyncStorage.getItem('backup:auto');
    expect(raw).toBeTruthy();
    expect(JSON.parse(raw as string).collections.tractors).toHaveLength(1);
  });
});

describe('toCsv', () => {
  it('; ajratgich, BOM, qo\'shtirnoq', () => {
    expect(toCsv([{ a: 1, b: 'x;y' }])).toBe('\uFEFFa;b\r\n1;"x;y"');
  });
});
