import { DEMO_TRACTORS, DEMO_USERS } from '../../lib/db/demoSeed';
import { hashPin } from '../../lib/sessionStore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { enqueue, createCollection, StorageError, CorruptDataError, newId } from '../../lib/db/storage';
import { db, initDb } from '../../lib/db';
import { todayLocal } from '../../lib/core/dates';

type Item = { id: string; name: string; n?: number };

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('createCollection', () => {
  it('CRUD aylanmasi', async () => {
    const c = createCollection<Item>('items');
    expect(await c.list()).toEqual([]);
    const a = await c.insert({ name: 'a' });
    expect(a.id).toBeTruthy();
    expect(await c.get(a.id)).toEqual(a);
    const u = await c.update(a.id, { name: 'b' });
    expect(u).toEqual({ ...a, name: 'b' });
    expect((await c.list())[0].name).toBe('b');
    await c.remove(a.id);
    expect(await c.list()).toEqual([]);
    expect(await c.get(a.id)).toBeNull();
  });

  it('update mavjud bo\'lmagan id -> StorageError', async () => {
    const c = createCollection<Item>('items');
    await expect(c.update('yoq', { name: 'x' })).rejects.toBeInstanceOf(StorageError);
  });

  it('buzilgan JSON -> CorruptDataError', async () => {
    await AsyncStorage.setItem('col:items', '{buzuq');
    const c = createCollection<Item>('items');
    const err = await c.list().catch((e) => e);
    expect(err).toBeInstanceOf(CorruptDataError);
    expect(err.key).toBe('col:items');
  });

  it('20 ta bir vaqtdagi insert -> 20 ta yozuv', async () => {
    const c = createCollection<Item>('items');
    await Promise.all(Array.from({ length: 20 }, (_, i) => c.insert({ name: 'n' + i })));
    const all = await c.list();
    expect(all).toHaveLength(20);
    expect(new Set(all.map((x) => x.id)).size).toBe(20);
  });

  it("rad etilgan navbat vazifasi keyingilarni to'sib qo'ymaydi", async () => {
    const c = createCollection<Item>('items');
    await expect(enqueue(() => Promise.reject(new Error('x')))).rejects.toThrow('x');
    await c.insert({ name: 'a' });
    expect(await c.list()).toHaveLength(1);
  });

  it('replaceAll', async () => {
    const c = createCollection<Item>('items');
    await c.insert({ name: 'a' });
    await c.replaceAll([{ id: 'z', name: 'z' }]);
    expect(await c.list()).toEqual([{ id: 'z', name: 'z' }]);
  });

  it('newId noyob', () => {
    expect(newId()).not.toBe(newId());
  });
});

describe('initDb', () => {
  it('bir vaqtdagi chaqiruvlar ikki marta seed qilmaydi', async () => {
    await Promise.all([initDb(), initDb()]);
    expect(await db.tractors.list()).toHaveLength(DEMO_TRACTORS.length);
    expect(await db.users.list()).toHaveLength(DEMO_USERS.length);
  });

  it('ikki marta chaqirilsa seed takrorlanmaydi', async () => {
    await initDb();
    await initDb();
    expect(await db.tractors.list()).toHaveLength(DEMO_TRACTORS.length);
    expect((await db.tractors.list())[0].model).toBe('Claas Arion 630');
    expect(await db.users.list()).toHaveLength(DEMO_USERS.length);
    expect((await db.users.list())[0]).toMatchObject({ name: 'Ilxomjon Xolmirzayev', role: 'admin', phone: '+998 99 977 7555', pinHash: hashPin('1111') });
    expect((await db.regulation.list()).length).toBeGreaterThan(0);
    expect((await db.operationTypes.list()).length).toBeGreaterThan(0);
    expect((await db.settings.get()).gamma).toBe(1);
  });

  it("buzilgan col:tractors ishga tushirishda CorruptDataError beradi", async () => {
    await initDb();
    await AsyncStorage.setItem('col:tractors', '{buzuq');
    await expect(initDb()).rejects.toBeInstanceOf(CorruptDataError);
  });

  it("massiv bo'lmagan kolleksiya va buzilgan sozlama ham aniqlanadi", async () => {
    await initDb();
    await AsyncStorage.setItem('col:motoReadings', '{"a":1}');
    await expect(initDb()).rejects.toBeInstanceOf(CorruptDataError);
    await AsyncStorage.setItem('col:motoReadings', '[]');
    await AsyncStorage.setItem('doc:settings', 'xx');
    await expect(initDb()).rejects.toBeInstanceOf(CorruptDataError);
  });

  it('seed traktor sanasi mahalliy bugungi sana', async () => {
    await initDb();
    expect((await db.tractors.list())[0].registrationDate).toBe(todayLocal());
  });
});
