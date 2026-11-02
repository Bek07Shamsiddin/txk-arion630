import { canDemoteOrDeactivate, isValidPin } from '../lib/users';
import type { User } from '../lib/db/schema';

const u = (id: string, role: User['role'], active = true): User => ({
  id, name: id, role, pinHash: null, active, createdAt: 'x',
});

describe('canDemoteOrDeactivate', () => {
  it('oxirgi faol admin -> false', () => {
    const a = u('a', 'admin');
    expect(canDemoteOrDeactivate([a, u('b', 'operator')], a)).toBe(false);
    expect(canDemoteOrDeactivate([a, u('c', 'admin', false)], a)).toBe(false);
  });
  it('ikkinchi faol admin bor -> true', () => {
    const a = u('a', 'admin');
    expect(canDemoteOrDeactivate([a, u('b', 'admin')], a)).toBe(true);
  });
  it('faolsiz admin yoki admin bo\'lmagan -> true', () => {
    const a = u('a', 'admin', false);
    expect(canDemoteOrDeactivate([a], a)).toBe(true);
    const o = u('o', 'operator');
    expect(canDemoteOrDeactivate([o], o)).toBe(true);
  });
});

describe('isValidPin', () => {
  it('tekshiradi', () => {
    expect(isValidPin('1234')).toBe(true);
    for (const p of ['123', '12a4', '', '12345']) expect(isValidPin(p)).toBe(false);
  });
});
