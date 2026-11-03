import { DEMO_TRACTORS } from '../../lib/db/demoSeed';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db, initDb } from '../../lib/db';
import { exportAll, importAll, toCsv, ImportError, restoreAutoBackup, getAutoBackupInfo } from '../../lib/db/backup';
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
    expect(before).toHaveLength(DEMO_TRACTORS.length);
  });

  it('kelajak schemaVersion rad etiladi', async () => {
    const a = await exportAll();
    await expect(importAll(JSON.stringify({ ...a, schemaVersion: 2 }))).rejects.toBeInstanceOf(ImportError);
  });

  it('schemaVersion yo\'q (v0) migrate orqali qabul', async () => {
    const a = await exportAll();
    const { schemaVersion, settings, ...v0 } = a;
    await importAll(JSON.stringify(v0));
    expect(JSON.parse((await AsyncStorage.getItem('doc:settings')) as string)).toEqual(DEFAULT_SETTINGS);
    expect(await db.tractors.list()).toHaveLength(DEMO_TRACTORS.length);
  });

  it('import oldin backup:auto yoziladi', async () => {
    const a = await exportAll();
    await importAll(JSON.stringify(a));
    const raw = await AsyncStorage.getItem('backup:auto');
    expect(raw).toBeTruthy();
    expect(JSON.parse(JSON.parse(raw as string).raw['col:tractors'])).toHaveLength(DEMO_TRACTORS.length);
  });

  it('backup:auto OLDINGI holatni saqlaydi', async () => {
    const A = await exportAll();
    const t = (await db.tractors.list())[0];
    await db.tractors.update(t.id, { model: 'B-model' });
    await importAll(JSON.stringify(A));
    const auto = JSON.parse((await AsyncStorage.getItem('backup:auto')) as string);
    expect(JSON.parse(auto.raw['col:tractors'])[0].model).toBe('B-model');
    expect((await db.tractors.list())[0].model).toBe('Claas Arion 630');
  });

  it("validatsiyadan o'tmagan import ma'lumotni va backup:auto ni o'zgartirmaydi", async () => {
    const A = await exportAll();
    const bad = { ...A, collections: { ...A.collections, tractors: 'yoq' } };
    const before = await AsyncStorage.getAllKeys();
    await expect(importAll(JSON.stringify(bad))).rejects.toBeInstanceOf(ImportError);
    expect(await AsyncStorage.getItem('backup:auto')).toBeNull();
    expect(await db.tractors.list()).toHaveLength(DEMO_TRACTORS.length);
    expect(await AsyncStorage.getAllKeys()).toEqual(before);
  });

  it("settings yo'q v1 fayl -> default yoziladi", async () => {
    const { settings, ...noSettings } = await exportAll();
    await importAll(JSON.stringify(noSettings));
    expect(JSON.parse((await AsyncStorage.getItem('doc:settings')) as string)).toEqual(DEFAULT_SETTINGS);
  });

  it("joriy kalit buzilgan bo'lsa ham import ishlaydi", async () => {
    const A = await exportAll();
    await AsyncStorage.setItem('col:tractors', '{buzuq');
    await importAll(JSON.stringify(A));
    expect(await db.tractors.list()).toHaveLength(DEMO_TRACTORS.length);
    const auto = JSON.parse((await AsyncStorage.getItem('backup:auto')) as string);
    expect(auto.raw['col:tractors']).toBe('{buzuq');
  });
});

describe('import himoyasi', () => {
  it('faol administratorsiz fayl rad etiladi', async () => {
    const A = await exportAll();
    const users = (A.collections.users as { active: boolean; role: string }[]).map((u) => ({ ...u, active: false }));
    const before = await db.users.list();
    await expect(importAll(JSON.stringify({ ...A, collections: { ...A.collections, users } }))).rejects.toBeInstanceOf(ImportError);
    const ops = (A.collections.users as { role: string }[]).map((u) => ({ ...u, role: 'operator' }));
    await expect(importAll(JSON.stringify({ ...A, collections: { ...A.collections, users: ops } }))).rejects.toBeInstanceOf(ImportError);
    await expect(importAll(JSON.stringify({ ...A, collections: { ...A.collections, users: [] } }))).rejects.toBeInstanceOf(ImportError);
    expect(await db.users.list()).toEqual(before);
  });

  it("bo'sh reglamentli fayl rad etiladi", async () => {
    const A = await exportAll();
    await expect(importAll(JSON.stringify({ ...A, collections: { ...A.collections, regulation: [] } }))).rejects.toBeInstanceOf(ImportError);
    expect((await db.regulation.list()).length).toBeGreaterThan(0);
  });
});

describe('toCsv', () => {
  it('; ajratgich, BOM, qo\'shtirnoq', () => {
    expect(toCsv([{ a: 1, b: 'x;y' }])).toBe('\uFEFFa;b\r\n1;"x;y"');
  });
});

describe('restoreAutoBackup', () => {
  it("A ustiga B import -> restoreAutoBackup -> ma'lumot B ga qaytadi", async () => {
    const t = (await db.tractors.list())[0];
    await db.tractors.update(t.id, { model: 'A-model' });
    const A = await exportAll();
    await db.tractors.update(t.id, { model: 'B-model' });
    const B = await exportAll();
    await importAll(JSON.stringify(A)); // auto = B
    expect((await db.tractors.list())[0].model).toBe('A-model');
    await restoreAutoBackup();
    const now = await exportAll();
    expect({ ...now, exportedAt: '' }).toEqual({ ...B, exportedAt: '' });
  });

  it("backup:auto yo'q -> ImportError", async () => {
    await expect(restoreAutoBackup()).rejects.toBeInstanceOf(ImportError);
    expect(await getAutoBackupInfo()).toBeNull();
  });

  it('buzilgan xom satrlar aynan tiklanadi, yangi auto yaratilmaydi', async () => {
    const A = await exportAll();
    await AsyncStorage.setItem('col:tractors', '{buzuq');
    await importAll(JSON.stringify(A));
    const autoBefore = await AsyncStorage.getItem('backup:auto');
    await restoreAutoBackup();
    expect(await AsyncStorage.getItem('col:tractors')).toBe('{buzuq');
    expect(await AsyncStorage.getItem('backup:auto')).toBe(autoBefore);
  });

  it("null qiymatlar o'chiriladi; getAutoBackupInfo savedAt qaytaradi", async () => {
    const A = await exportAll();
    await AsyncStorage.removeItem('col:notifications');
    await importAll(JSON.stringify(A));
    expect(await AsyncStorage.getItem('col:notifications')).not.toBeNull();
    await restoreAutoBackup();
    expect(await AsyncStorage.getItem('col:notifications')).toBeNull();
    const info = await getAutoBackupInfo();
    expect(typeof info?.savedAt).toBe('string');
  });
});
