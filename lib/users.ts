import type { User } from './db/schema';

export const isValidPin = (pin: string): boolean => /^\d{4}$/.test(pin);

/** Oxirgi faol administratorni pasaytirib yoki faolsizlantirib bo'lmaydi. */
export function canDemoteOrDeactivate(users: User[], target: User): boolean {
  if (target.role !== 'admin' || !target.active) return true;
  return users.some((u) => u.id !== target.id && u.role === 'admin' && u.active);
}
