import AsyncStorage from '@react-native-async-storage/async-storage';
import { db, initDb } from '../../lib/db';
import { StorageError } from '../../lib/db/storage';
import {
  acceptMechanicRequest,
  allowedPartsStatuses,
  completeMechanicRequest,
  createMechanicRequest,
  createPartsRequests,
  setPartsStatus,
} from '../../lib/services/requests';

beforeEach(async () => {
  await AsyncStorage.clear();
  await initDb();
});

const base = { tractorId: 'tr1', requestedBy: 'u1', urgency: 'normal' as const, notes: null, levelCode: null };

describe('allowedPartsStatuses', () => {
  test('oqim va bekor qilish', () => {
    expect(allowedPartsStatuses('pending')).toEqual(['ordered', 'cancelled']);
    expect(allowedPartsStatuses('ordered')).toEqual(['in_transit', 'cancelled']);
    expect(allowedPartsStatuses('in_transit')).toEqual(['delivered', 'cancelled']);
    expect(allowedPartsStatuses('delivered')).toEqual([]);
    expect(allowedPartsStatuses('cancelled')).toEqual([]);
  });
});

describe('parts requests', () => {
  test('har bir qism uchun alohida so\'rov, levelCode va pending', async () => {
    const out = await createPartsRequests({
      ...base,
      levelCode: 'T250',
      parts: [
        { name: 'Moy filtri', quantity: 1 },
        { name: 'Moy', quantity: 12 },
      ],
    });
    expect(out).toHaveLength(2);
    expect(out.every((r) => r.status === 'pending' && r.levelCode === 'T250' && r.deliveredAt === null)).toBe(true);
    expect((await db.partsRequests.list()).map((r) => r.partName)).toEqual(['Moy filtri', 'Moy']);
  });

  test('bo\'sh yoki noto\'g\'ri qism -> StorageError', async () => {
    await expect(createPartsRequests({ ...base, parts: [] })).rejects.toBeInstanceOf(StorageError);
    await expect(createPartsRequests({ ...base, parts: [{ name: ' ', quantity: 1 }] })).rejects.toBeInstanceOf(StorageError);
    await expect(createPartsRequests({ ...base, parts: [{ name: 'A', quantity: 0 }] })).rejects.toBeInstanceOf(StorageError);
  });

  test('holat oqimi va deliveredAt', async () => {
    const [r] = await createPartsRequests({ ...base, parts: [{ name: 'A', quantity: 1 }] });
    expect((await setPartsStatus(r.id, 'ordered')).status).toBe('ordered');
    expect((await setPartsStatus(r.id, 'in_transit')).deliveredAt).toBeNull();
    const d = await setPartsStatus(r.id, 'delivered');
    expect(d.status).toBe('delivered');
    expect(d.deliveredAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  test('noto\'g\'ri o\'tish va yakuniy holat -> StorageError', async () => {
    const [r] = await createPartsRequests({ ...base, parts: [{ name: 'A', quantity: 1 }] });
    await expect(setPartsStatus(r.id, 'delivered')).rejects.toBeInstanceOf(StorageError);
    await setPartsStatus(r.id, 'cancelled');
    await expect(setPartsStatus(r.id, 'ordered')).rejects.toBeInstanceOf(StorageError);
    const [r2] = await createPartsRequests({ ...base, parts: [{ name: 'B', quantity: 1 }] });
    await setPartsStatus(r2.id, 'ordered');
    await setPartsStatus(r2.id, 'in_transit');
    await setPartsStatus(r2.id, 'delivered');
    await expect(setPartsStatus(r2.id, 'cancelled')).rejects.toBeInstanceOf(StorageError);
    await expect(setPartsStatus('yoq', 'ordered')).rejects.toBeInstanceOf(StorageError);
  });
});

describe('mechanic requests', () => {
  test('yaratish: pending + mexanik eslatmasi', async () => {
    const m = await createMechanicRequest({ tractorId: 'tr1', problem: 'Dvigatel taqillaydi', userId: 'u1' });
    expect(m.status).toBe('pending');
    expect(m.technicianId).toBeNull();
    expect(m.closedAt).toBeNull();
    const ns = await db.notifications.list();
    expect(ns).toHaveLength(1);
    expect(ns[0]).toMatchObject({
      kind: 'mechanic',
      levelCode: null,
      tractorId: 'tr1',
      message: 'Mexanik chaqirildi: Dvigatel taqillaydi',
      dedupeKey: `mechanic:${m.id}`,
      isRead: false,
    });
  });

  test('bo\'sh muammo -> StorageError', async () => {
    await expect(createMechanicRequest({ tractorId: 'tr1', problem: '  ', userId: 'u1' })).rejects.toBeInstanceOf(StorageError);
  });

  test('qabul qilish va yakunlash', async () => {
    const m = await createMechanicRequest({ tractorId: 'tr1', problem: 'X', userId: 'u1' });
    const a = await acceptMechanicRequest(m.id, 'tech1');
    expect(a).toMatchObject({ status: 'in_progress', technicianId: 'tech1' });
    const c = await completeMechanicRequest(m.id, 'Almashtirildi');
    expect(c.status).toBe('completed');
    expect(c.technicianNotes).toBe('Almashtirildi');
    expect(c.closedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  test('noto\'g\'ri o\'tishlar -> StorageError', async () => {
    const m = await createMechanicRequest({ tractorId: 'tr1', problem: 'X', userId: 'u1' });
    await expect(completeMechanicRequest(m.id, 'n')).rejects.toBeInstanceOf(StorageError);
    await acceptMechanicRequest(m.id, 't');
    await expect(acceptMechanicRequest(m.id, 't')).rejects.toBeInstanceOf(StorageError);
    await completeMechanicRequest(m.id, 'n');
    await expect(completeMechanicRequest(m.id, 'n')).rejects.toBeInstanceOf(StorageError);
    await expect(acceptMechanicRequest('yoq', 't')).rejects.toBeInstanceOf(StorageError);
  });
});
