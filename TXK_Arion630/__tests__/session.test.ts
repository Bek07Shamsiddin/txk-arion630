import AsyncStorage from '@react-native-async-storage/async-storage';
import { db, initDb } from '../lib/db';
import { SESSION_KEY, hashPin, signInUser, restoreSession, clearSession } from '../lib/sessionStore';

beforeEach(async () => {
  await AsyncStorage.clear();
  await initDb();
});

describe('hashPin', () => {
  it('barqaror va farqli', () => {
    expect(hashPin('1234')).toBe(hashPin('1234'));
    expect(hashPin('1234')).not.toBe(hashPin('1235'));
    expect(hashPin('1234')).toMatch(/^[0-9a-f]{8}$/);
  });
});

describe('signInUser', () => {
  it("PIN'li foydalanuvchiga noto'g'ri PIN -> null, to'g'ri -> user", async () => {
    const u = await db.users.insert({ name: 'A', role: 'operator', pinHash: hashPin('1234'), active: true, createdAt: 'x' });
    expect(await signInUser(u.id, '0000')).toBeNull();
    expect(await signInUser(u.id, null)).toBeNull();
    expect((await signInUser(u.id, '1234'))?.id).toBe(u.id);
  });

  it("PIN'siz foydalanuvchi -> kiradi", async () => {
    const u = await db.users.insert({ name: 'B', role: 'technician', pinHash: null, active: true, createdAt: 'x' });
    expect((await signInUser(u.id, null))?.id).toBe(u.id);
  });

  it('faolsiz foydalanuvchi va noma\'lum id -> null', async () => {
    const u = await db.users.insert({ name: 'C', role: 'operator', pinHash: null, active: false, createdAt: 'x' });
    expect(await signInUser(u.id, null)).toBeNull();
    expect(await signInUser('yoq', null)).toBeNull();
  });

  it('id saqlanadi, restore tiklaydi, clear o\'chiradi', async () => {
    const u = await db.users.insert({ name: 'D', role: 'operator', pinHash: null, active: true, createdAt: 'x' });
    await signInUser(u.id, null);
    expect(await AsyncStorage.getItem(SESSION_KEY)).toBe(u.id);
    expect((await restoreSession())?.id).toBe(u.id);
    await clearSession();
    expect(await AsyncStorage.getItem(SESSION_KEY)).toBeNull();
    expect(await restoreSession()).toBeNull();
  });

  it('restore: faolsizlantirilgan foydalanuvchi tiklanmaydi', async () => {
    const u = await db.users.insert({ name: 'E', role: 'operator', pinHash: null, active: true, createdAt: 'x' });
    await signInUser(u.id, null);
    await db.users.update(u.id, { active: false });
    expect(await restoreSession()).toBeNull();
  });
});
