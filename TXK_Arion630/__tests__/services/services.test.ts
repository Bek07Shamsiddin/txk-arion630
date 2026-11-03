import AsyncStorage from '@react-native-async-storage/async-storage';
import { db, initDb } from '../../lib/db';
import { todayLocal } from '../../lib/core/dates';
import { StorageError } from '../../lib/db/storage';
import type { Tractor } from '../../lib/db/schema';
import { DEFAULT_REGULATION } from '../../lib/core/defaults';
import { refreshAlerts } from '../../lib/services/alerts';
import { deleteMotoReading, recomputeEquivalentHours, recordMotoReading } from '../../lib/services/motoReadings';
import { deleteServiceRecord, recordService } from '../../lib/services/service';
import {
  forecastForLevel,
  getTractorView,
  listTractorViews,
  registerTractor,
} from '../../lib/services/tractors';

const REF = [{ operationTypeId: 'ref', hours: 0 }];
const T250_MSG = 'TXK-1: dvigatel moyi va filtri: 5 soat qoldi';

async function newTractor(): Promise<Tractor> {
  return registerTractor({
    model: 'Test',
    serialNumber: 'T-' + Math.random(),
    registrationDate: '2026-03-01',
    location: '',
    operatorName: '',
    photoUri: null,
    initialReading: 0,
  });
}

async function read(t: Tractor, date: string, reading: number, extra: { confirmOver24h?: boolean } = {}) {
  return recordMotoReading({
    tractorId: t.id,
    date,
    reading,
    shares: REF,
    fuelLiters: null,
    note: null,
    userId: 'u1',
    ...extra,
  });
}

async function svc(t: Tractor, levelCode: string, date: string) {
  return recordService({
    tractorId: t.id,
    levelCode,
    date,
    durationHours: 1,
    usedParts: [],
    note: null,
    photoUris: [],
    userId: 'u1',
  });
}

async function readTo245(t: Tractor) {
  const steps: [string, number][] = [
    ['2026-03-04', 50],
    ['2026-03-07', 100],
    ['2026-03-10', 150],
    ['2026-03-13', 200],
    ['2026-03-16', 245],
  ];
  for (const [d, v] of steps) {
    const r = await read(t, d, v);
    expect(r.ok).toBe(true);
  }
}

beforeEach(async () => {
  await AsyncStorage.clear();
  await initDb();
  const ops = await db.operationTypes.list();
  await db.operationTypes.replaceAll([...ops, { id: 'ref', name: 'Etalon', fuelLph: 18, source: 'test', verified: true }]);
});

describe('services', () => {
  test('(a) 245 moto-soat: T250 keyingi, qolgan 5, eslatma matni', async () => {
    const t = await newTractor();
    await readTo245(t);
    await svc(t, 'O50', '2026-03-16');
    await svc(t, 'O100', '2026-03-16');
    const view = await getTractorView(t.id, '2026-03-16');
    expect(view.currentReading).toBe(245);
    expect(view.totalEquivHours).toBeCloseTo(245);
    expect(view.next?.code).toBe('T250');
    expect(view.next?.remainingHours).toBe(5);
    expect(view.color).toBe('yellow');
    const notes = (await db.notifications.list()).filter((n) => n.kind === 'service_soon');
    expect(notes.map((n) => n.message)).toContain(T250_MSG);
  });

  test('(b) 180 moto-soat: qolgan 70, T250 eslatmasi yoq', async () => {
    const t = await newTractor();
    await read(t, '2026-03-05', 90);
    await read(t, '2026-03-09', 180);
    await svc(t, 'O50', '2026-03-09');
    await svc(t, 'O100', '2026-03-09');
    const view = await getTractorView(t.id, '2026-03-09');
    expect(view.next?.code).toBe('T250');
    expect(view.next?.remainingHours).toBe(70);
    expect(view.color).toBe('green');
    expect((await db.notifications.list()).filter((n) => n.levelCode === 'T250')).toEqual([]);
  });

  test('(c) kamayuvchi hisoblagich', async () => {
    const t = await newTractor();
    await read(t, '2026-03-05', 90);
    expect(await read(t, '2026-03-06', 80)).toEqual({ ok: false, error: 'decreasing' });
  });

  test('(d) oldingi sana', async () => {
    const t = await newTractor();
    await read(t, '2026-03-05', 90);
    expect(await read(t, '2026-03-04', 95)).toEqual({ ok: false, error: 'date_before_last' });
  });

  test('(e) 1 kunda 30 soat: tasdiq kerak', async () => {
    const t = await newTractor();
    await read(t, '2026-03-05', 10);
    expect(await read(t, '2026-03-06', 40)).toEqual({ ok: false, error: 'over_24h_needs_confirm' });
    expect((await read(t, '2026-03-06', 40, { confirmOver24h: true })).ok).toBe(true);
  });

  test('not_number va shares_mismatch, avto-to\'ldirish', async () => {
    const t = await newTractor();
    expect(await read(t, '2026-03-05', NaN)).toEqual({ ok: false, error: 'not_number' });
    expect(await read(t, '2026-03-05', -1)).toEqual({ ok: false, error: 'not_number' });
    const bad = await recordMotoReading({
      tractorId: t.id, date: '2026-03-05', reading: 10,
      shares: [{ operationTypeId: 'ref', hours: 3 }], fuelLiters: 0, note: null, userId: 'u',
    });
    expect(bad).toEqual({ ok: false, error: 'not_number' });
    const mm = await recordMotoReading({
      tractorId: t.id, date: '2026-03-05', reading: 10,
      shares: [{ operationTypeId: 'ref', hours: 3 }], fuelLiters: null, note: null, userId: 'u',
    });
    expect(mm).toEqual({ ok: false, error: 'shares_mismatch' });
    const ok = await read(t, '2026-03-05', 10);
    expect(ok.ok && ok.reading.shares[0].hours).toBe(10);
  });

  test('(f) xato yozuvni o\'chirish holatni tiklaydi', async () => {
    const t = await newTractor();
    await readTo245(t);
    await svc(t, 'O50', '2026-03-16');
    await svc(t, 'O100', '2026-03-16');
    const before = await getTractorView(t.id, '2026-06-30');
    const bad = await read(t, '2026-06-30', 2450, { confirmOver24h: true });
    expect(bad.ok).toBe(true);
    expect((await getTractorView(t.id, '2026-06-30')).currentReading).toBe(2450);
    if (bad.ok) await deleteMotoReading(bad.reading.id);
    const after = await getTractorView(t.id, '2026-06-30');
    expect(after.currentReading).toBe(245);
    expect(after.next).toEqual(before.next);
  });

  test('o\'chirish faqat oxirgi yozuv uchun', async () => {
    const t = await newTractor();
    const a = await read(t, '2026-03-05', 10);
    await read(t, '2026-03-06', 20);
    if (a.ok) await expect(deleteMotoReading(a.reading.id)).rejects.toBeInstanceOf(StorageError);
  });

  test('(g) refreshAlerts ikki marta', async () => {
    const t = await newTractor();
    await readTo245(t);
    await refreshAlerts(t.id, '2026-03-16');
    expect(await refreshAlerts(t.id, '2026-03-16')).toEqual([]);
  });

  test('(h) keyingi siklda soon eslatmasi qayta chiqadi', async () => {
    const t = await newTractor();
    await readTo245(t);
    await svc(t, 'O50', '2026-03-16');
    await svc(t, 'O100', '2026-03-16');
    await svc(t, 'T250', '2026-03-16');
    await read(t, '2026-03-26', 470);
    const soon = (await db.notifications.list()).filter((n) => n.levelCode === 'T250' && n.kind === 'service_soon');
    expect(soon).toHaveLength(2);
    expect(new Set(soon.map((n) => n.dedupeKey)).size).toBe(2);
  });

  test('(i) reorder 9 kunlik prognozda; ochiq buyurtma bo\'lsa chiqmaydi', async () => {
    const a = await newTractor();
    for (let i = 1; i <= 4; i++) await read(a, `2026-03-0${i}`, 20 * i);
    const r = (await db.notifications.list()).filter((n) => n.levelCode === 'T250' && n.kind === 'reorder');
    expect(r).toHaveLength(1);
    expect(r[0].message).toBe('TXK-1: dvigatel moyi va filtri uchun ehtiyot qismlarni buyurtma qiling (≈9 kun qoldi)');
    expect(await refreshAlerts(a.id, '2026-03-04')).toEqual([]);

    const b = await newTractor();
    for (let i = 1; i <= 3; i++) await read(b, `2026-03-0${i}`, 20 * i);
    await db.partsRequests.insert({
      tractorId: b.id, partName: 'Dvigatel moyi', quantity: 1, urgency: 'normal', levelCode: 'T250',
      status: 'pending', requestedBy: 'u1', requestDate: '2026-03-03', deliveredAt: null, notes: null,
      createdAt: new Date().toISOString(),
    });
    await read(b, '2026-03-04', 80);
    const rb = (await db.notifications.list()).filter(
      (n) => n.tractorId === b.id && n.levelCode === 'T250' && n.kind === 'reorder',
    );
    expect(rb).toEqual([]);
  });

  test('recordService: noma\'lum daraja -> StorageError', async () => {
    const t = await newTractor();
    await expect(svc(t, 'X999', '2026-03-05')).rejects.toBeInstanceOf(StorageError);
  });

  test('listTractorViews va overdue kalendar matni', async () => {
    const t = await newTractor();
    const views = await listTractorViews('2027-03-02');
    const mine = views.find((v) => v.tractor.id === t.id)!;
    expect(mine.color).toBe('red');
    const created = await refreshAlerts(t.id, '2027-03-02');
    expect(created.map((n) => n.message)).toContain('TXK-1: dvigatel moyi va filtri: 12 oydan beri bajarilmagan');
  });

  test('forecastForLevel: ikki shartdan eng erta', () => {
    const level = DEFAULT_REGULATION.find((l) => l.code === 'T250')!;
    const counter = { code: 'T250', physSince: 100, equivSince: 100, lastServiceDate: '2026-03-01', done: false };
    const s = { gamma: 1 } as any;
    // ekv: 150/30=5, fiz: 150/10=15 -> 5
    expect(forecastForLevel(level, counter, s, { equiv: 30, phys: 10 }, 100, '2026-03-10')?.days).toBe(5);
    // ekv intensivligi null -> faqat fizik
    expect(forecastForLevel(level, counter, s, { equiv: null, phys: 10 }, 100, '2026-03-10')?.days).toBe(15);
    expect(forecastForLevel(level, counter, s, { equiv: null, phys: null }, 100, '2026-03-10')).toBeNull();
  });
});

describe("TXK yozuvini o'chirish va sana tekshiruvlari", () => {
  const tomorrow = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return todayLocal(d);
  };

  test("faqat oxirgi TXK yozuvi o'chiriladi", async () => {
    const t = await newTractor();
    const a = await svc(t, 'O50', '2026-03-10');
    const b = await svc(t, 'O100', '2026-03-12');
    await expect(deleteServiceRecord(a.id)).rejects.toBeInstanceOf(StorageError);
    await deleteServiceRecord(b.id);
    expect((await db.serviceRecords.list()).map((r) => r.id)).toEqual([a.id]);
    await deleteServiceRecord(a.id);
    expect(await db.serviceRecords.list()).toEqual([]);
    await expect(deleteServiceRecord('yoq')).rejects.toBeInstanceOf(StorageError);
  });

  test("o'chirilgach daraja holati qayta hisoblanadi", async () => {
    const t = await newTractor();
    await readTo245(t);
    const rec = await svc(t, 'O50', '2026-03-16');
    expect((await getTractorView(t.id, '2026-03-16')).statuses.some((s) => s.code === 'O50')).toBe(false);
    await deleteServiceRecord(rec.id);
    expect((await getTractorView(t.id, '2026-03-16')).statuses.some((s) => s.code === 'O50')).toBe(true);
  });

  test('kelajak sanali TXK yozuvi rad etiladi', async () => {
    const t = await newTractor();
    await expect(svc(t, 'O50', tomorrow())).rejects.toBeInstanceOf(StorageError);
    expect(await db.serviceRecords.list()).toEqual([]);
  });

  test("ro'yxatga olinishdan oldingi sana rad etiladi", async () => {
    const t = await newTractor(); // 2026-03-01
    await expect(svc(t, 'O50', '2026-02-28')).rejects.toBeInstanceOf(StorageError);
    await expect(svc(t, 'O50', '2026-03-01')).resolves.toBeTruthy();
  });

  test('kelajak sanali moto-soat rad etiladi', async () => {
    const t = await newTractor();
    expect(await read(t, tomorrow(), 10)).toEqual({ ok: false, error: 'future_date' });
    expect(await db.motoReadings.list()).toEqual([]);
  });
});

describe('recomputeEquivalentHours', () => {
  test("Haydash yoqilg'i sarfi o'zgarsa keltirilgan soat qayta hisoblanadi", async () => {
    const t = await newTractor();
    const res = await recordMotoReading({
      tractorId: t.id,
      date: '2026-03-05',
      reading: 10,
      shares: [{ operationTypeId: 'plowing', hours: 10 }],
      fuelLiters: null,
      note: null,
      userId: 'u1',
    });
    expect(res.ok).toBe(true);
    expect((await db.motoReadings.list())[0].equivHours).toBeCloseTo((10 * 24) / 18);
    expect(await recomputeEquivalentHours()).toBe(0);
    const ops = await db.operationTypes.list();
    await db.operationTypes.replaceAll(ops.map((o) => (o.id === 'plowing' ? { ...o, fuelLph: 27 } : o)));
    expect(await recomputeEquivalentHours()).toBe(1);
    expect((await db.motoReadings.list())[0].equivHours).toBeCloseTo((10 * 27) / 18);
    expect((await getTractorView(t.id, '2026-03-05')).totalEquivHours).toBeCloseTo(15);
  });

  test("nominalFuelLph o'zgarishi ham hisobga olinadi", async () => {
    const t = await newTractor();
    await read(t, '2026-03-05', 10);
    const s = await db.settings.get();
    await db.settings.set({ ...s, nominalFuelLph: 36 });
    expect(await recomputeEquivalentHours()).toBe(1);
    expect((await db.motoReadings.list())[0].equivHours).toBeCloseTo(5);
  });
});
