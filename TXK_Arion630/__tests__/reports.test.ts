import AsyncStorage from '@react-native-async-storage/async-storage';
import { db, initDb } from '../lib/db';
import { DEFAULT_SETTINGS } from '../lib/core/defaults';
import {
  operatorActivity,
  overdueList,
  partsUsage,
  physVsEquiv,
  readinessByTractor,
} from '../lib/reports';

async function mkTractor(model: string, initialReading = 0) {
  return db.tractors.insert({
    model,
    serialNumber: 'S-' + model,
    registrationDate: '2026-01-01',
    location: '',
    operatorName: '',
    photoUri: null,
    initialReading,
    status: 'active',
    createdAt: '2026-01-01T00:00:00.000Z',
  });
}

async function mkReading(tractorId: string, date: string, phys: number, equiv: number, userId = 'u1') {
  return db.motoReadings.insert({
    tractorId,
    date,
    reading: 0,
    physHours: phys,
    shares: [],
    fuelLiters: null,
    equivHours: equiv,
    userId,
    note: null,
    createdAt: date + 'T08:00:00.000Z',
  });
}

beforeEach(async () => {
  await AsyncStorage.clear();
  await initDb();
  await db.tractors.replaceAll([]);
  await db.settings.set({ ...DEFAULT_SETTINGS, shiftHoursPerDay: 10 });
});

describe('readinessByTractor', () => {
  it('K_tt = 900 / (900 + 30 + 70) = 0.9', async () => {
    const t = await mkTractor('A');
    await mkReading(t.id, '2026-03-05', 400, 400);
    await mkReading(t.id, '2026-03-10', 500, 500);
    await mkReading(t.id, '2026-02-01', 999, 999); // davrdan tashqari
    await db.serviceRecords.insert({
      tractorId: t.id, levelCode: 'TXK-1', date: '2026-03-12', reading: 0, durationHours: 30,
      usedParts: [], note: null, photoUris: [], userId: 'u1', createdAt: '2026-03-12T00:00:00.000Z',
    });
    await db.mechanicRequests.insert({
      tractorId: t.id, problem: 'x', status: 'completed',
      openedAt: '2026-03-15T00:00:00.000Z', closedAt: '2026-03-22T00:00:00.000Z', // 7 kun x 10 = 70
      userId: 'u1', technicianId: null, technicianNotes: null, createdAt: '2026-03-15T00:00:00.000Z',
    });
    const rows = await readinessByTractor('2026-03-01', '2026-03-31');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ tractorId: t.id, model: 'A', work: 900, service: 30 });
    expect(rows[0].downtime).toBeCloseTo(70, 5);
    expect(rows[0].kTt).toBeCloseTo(0.9, 5);
  });

  it('ma\'lumot bo\'lmasa kTt null', async () => {
    await mkTractor('A');
    const rows = await readinessByTractor('2026-03-01', '2026-03-31');
    expect(rows[0].kTt).toBeNull();
  });
});

describe('physVsEquiv', () => {
  it('og\'ir ishlatilgan traktorda ratio > 1; phys 0 bo\'lsa ratio 1', async () => {
    const heavy = await mkTractor('H');
    const idle = await mkTractor('I');
    await mkReading(heavy.id, '2026-03-05', 100, 130);
    await mkReading(heavy.id, '2026-03-06', 100, 130);
    const rows = await physVsEquiv();
    const h = rows.find((r) => r.tractorId === heavy.id)!;
    const i = rows.find((r) => r.tractorId === idle.id)!;
    expect(h.phys).toBe(200);
    expect(h.equiv).toBe(260);
    expect(h.ratio).toBeCloseTo(1.3, 5);
    expect(h.ratio).toBeGreaterThan(1);
    expect(i.ratio).toBe(1);
  });
});

describe('operatorActivity', () => {
  it('soatlar yig\'indisi yozuvlarga teng, kunlar noyob', async () => {
    const t = await mkTractor('A');
    const u = await db.users.insert({ name: 'Ali', role: 'operator', pinHash: null, active: true, createdAt: 'x' });
    await mkReading(t.id, '2026-03-05', 6, 6, u.id);
    await mkReading(t.id, '2026-03-05', 2, 2, u.id);
    await mkReading(t.id, '2026-03-06', 4, 4, u.id);
    await mkReading(t.id, '2026-03-07', 5, 5, 'ghost');
    await mkReading(t.id, '2026-04-07', 9, 9, u.id); // tashqarida
    const rows = await operatorActivity('2026-03-01', '2026-03-31');
    const ali = rows.find((r) => r.userId === u.id)!;
    expect(ali).toMatchObject({ name: 'Ali', tractorId: t.id, model: 'A', hours: 12, days: 2 });
    expect(rows.find((r) => r.userId === 'ghost')!.name).toBe('—');
    expect(rows.reduce((s, r) => s + r.hours, 0)).toBe(17);
  });
});

describe('partsUsage', () => {
  it('so\'ralgan va yetkazilgan, bekor qilinganlar hisobga olinmaydi', async () => {
    const t = await mkTractor('A');
    const base = { tractorId: t.id, urgency: 'normal' as const, levelCode: null, requestedBy: 'u1', requestDate: '2026-03-01', deliveredAt: null, notes: null, createdAt: 'x' };
    await db.partsRequests.insert({ ...base, partName: 'Filtr', quantity: 2, status: 'pending' });
    await db.partsRequests.insert({ ...base, partName: 'Filtr', quantity: 3, status: 'delivered' });
    await db.partsRequests.insert({ ...base, partName: 'Filtr', quantity: 7, status: 'cancelled' });
    const rows = await partsUsage();
    expect(rows).toEqual([{ partName: 'Filtr', requested: 5, delivered: 3 }]);
  });
});

describe('overdueList', () => {
  it('muddati o\'tgan darajalar, overdueHours musbat', async () => {
    const t = await mkTractor('A');
    await mkReading(t.id, '2026-03-05', 300, 300);
    const rows = await overdueList('2026-03-06');
    // Hisoblagich 0, lekin ikkala soat ham 300: kamida bitta daraja o'tgan bo'lishi kerak
    expect(rows.length).toBeGreaterThan(0);
    for (const r of rows) {
      expect(r.tractorId).toBe(t.id);
      expect(r.overdueHours).toBeGreaterThan(0);
    }
  });
});
