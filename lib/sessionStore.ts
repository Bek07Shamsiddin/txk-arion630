import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from './db';
import type { User } from './db/schema';

export const SESSION_KEY = 'session:userId';

/** FNV-1a 32-bit, hex. Xavfsizlik vositasi emas — faqat PIN'ni ochiq saqlamaslik uchun. */
export function hashPin(pin: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < pin.length; i++) {
    h ^= pin.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

/** Foydalanuvchini tekshiradi; muvaffaqiyatli bo'lsa id'ni saqlaydi va User qaytaradi. */
export async function signInUser(userId: string, pin: string | null): Promise<User | null> {
  const user = await db.users.get(userId);
  if (!user || !user.active) return null;
  if (user.pinHash !== null && (pin === null || hashPin(pin) !== user.pinHash)) return null;
  await AsyncStorage.setItem(SESSION_KEY, user.id);
  return user;
}

export async function restoreSession(): Promise<User | null> {
  const id = await AsyncStorage.getItem(SESSION_KEY);
  if (!id) return null;
  const user = await db.users.get(id);
  return user && user.active ? user : null;
}

export async function clearSession(): Promise<void> {
  await AsyncStorage.removeItem(SESSION_KEY);
}
