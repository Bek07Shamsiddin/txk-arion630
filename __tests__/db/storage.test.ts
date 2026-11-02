import AsyncStorage from '@react-native-async-storage/async-storage';
import { createCollection, StorageError, CorruptDataError, newId } from '../../lib/db/storage';
import { db, initDb } from '../../lib/db';

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
  it('ikki marta chaqirilsa seed takrorlanmaydi', async () => {
    await initDb();
    await initDb();
    expect(await db.tractors.list()).toHaveLength(1);
    expect((await db.tractors.list())[0].model).toBe('Claas Arion 630');
    expect(await db.users.list()).toHaveLength(1);
    expect((await db.users.list())[0]).toMatchObject({ name: 'Administrator', role: 'admin', pinHash: null });
    expect((await db.regulation.list()).length).toBeGreaterThan(0);
    expect((await db.operationTypes.list()).length).toBeGreaterThan(0);
    expect((await db.settings.get()).gamma).toBe(1);
  });
});
