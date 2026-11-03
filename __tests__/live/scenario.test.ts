import AsyncStorage from '@react-native-async-storage/async-storage';
import { db, initDb } from '../../lib/db';
import { DEMO_TRACTORS } from '../../lib/db/demoSeed';
import { liveTick, resetScenario, SCRIPT_TICKS } from '../../lib/live/fieldWork';
import { listTractorViews } from '../../lib/services/tractors';

const TODAY = '2026-11-03';
const NOON = new Date('2026-11-03T12:00:00');
const NIGHT = new Date('2026-11-03T23:00:00');

async function states() {
  const views = await listTractorViews(TODAY);
  const by = (serial: string) => views.find((v) => v.tractor.serialNumber === serial)!;
  return DEMO_TRACTORS.map((d) => by(d.serialNumber).color);
}
const count = (c: string[], x: string) => c.filter((y) => y === x).length;
async function runTo(from: number, to: number, now = NOON) {
  for (let t = from; t <= to; t++) await liveTick(t, TODAY, now);
}

beforeEach(async () => {
  await AsyncStorage.clear();
  await initDb();
  await resetScenario(TODAY);
});

test("boshlanishda: kamida bitta muddati o'tgan, bitta yaqinlashmoqda, qolgani me'yorida", async () => {
  const s = await states();
  expect(count(s, 'red')).toBeGreaterThanOrEqual(1);
  expect(count(s, 'yellow')).toBeGreaterThanOrEqual(1);
  expect(count(s, 'green')).toBeGreaterThanOrEqual(1);
});

test("2-daqiqada yana bir traktor yaqinlashmoqda holatiga o'tadi", async () => {
  const before = count(await states(), 'yellow');
  await runTo(1, 24);
  expect(count(await states(), 'yellow')).toBeGreaterThan(before);
});

test("5-daqiqada yana bir traktor TXK ga muhtoj (muddati o'tgan) bo'ladi va eskalatsiya chiqadi", async () => {
  await runTo(1, 60);
  const s = await states();
  expect(count(s, 'red')).toBeGreaterThanOrEqual(2);
  const kinds = (await db.notifications.list()).map((n) => n.kind);
  expect(kinds).toEqual(expect.arrayContaining(['service_soon', 'service_overdue', 'escalation']));
});

test("8-daqiqada 2 traktor ta'mirlanib yangi siklga o'tadi, muddati o'tganlar kamayadi", async () => {
  await runTo(1, SCRIPT_TICKS);
  const s = await states();
  expect(count(s, 'red')).toBe(0);
  expect((await db.serviceRecords.list()).length).toBeGreaterThanOrEqual(2);
  const by = new Set((await db.serviceRecords.list()).map((r) => r.userId));
  const techs = (await db.users.list()).filter((u) => u.role === 'technician').map((u) => u.id);
  expect([...by].every((id) => techs.includes(id))).toBe(true);
});

test("operatorlar nomidan yozuvlar kiritiladi; kechasi traktorlar ishlamaydi", async () => {
  await runTo(1, SCRIPT_TICKS);
  const ops = (await db.users.list()).filter((u) => u.role === 'operator').map((u) => u.id);
  const authors = new Set((await db.motoReadings.list()).map((r) => r.userId));
  expect(ops.every((id) => authors.has(id))).toBe(true);
  const before = (await db.motoReadings.list()).length;
  await runTo(SCRIPT_TICKS + 1, SCRIPT_TICKS + 200, NIGHT);
  expect((await db.motoReadings.list()).length).toBe(before);
});

test("qayta ochilganda ssenariy boshidan boshlanadi", async () => {
  await runTo(1, SCRIPT_TICKS);
  await resetScenario(TODAY);
  expect(await db.serviceRecords.list()).toHaveLength(0);
  const s = await states();
  expect(count(s, 'red')).toBeGreaterThanOrEqual(1);
});

test("nosozlik sikli: operator xabar beradi → usta ta'mirlaydi → ta'mir tugaydi (jadvaldagi nosozlik turi bilan)", async () => {
  await runTo(1, 12);
  let reqs = await db.mechanicRequests.list();
  expect(reqs).toHaveLength(1);
  expect(['Taqsimlash vali', 'Haydovchi nasos', 'Maxovik']).toContain(reqs[0].problem);
  await runTo(13, 18);
  reqs = await db.mechanicRequests.list();
  expect(reqs[0].status).toBe('in_progress');
  const tech = (await db.users.list()).find((u) => u.id === reqs[0].technicianId)!;
  expect(tech.role).toBe('technician');
  await runTo(19, 42);
  expect((await db.mechanicRequests.list())[0].status).toBe('completed');
});

test("ssenariydan keyin ham sikl davom etadi: yangi ogohlantirish va yangi TXK chiqadi, muddati o'tgan ko'p to'planmaydi", async () => {
  await runTo(1, SCRIPT_TICKS);
  const services = (await db.serviceRecords.list()).length;
  const notes = (await db.notifications.list()).length;
  for (let t = SCRIPT_TICKS + 1; t <= SCRIPT_TICKS + 600; t++) {
    await liveTick(t, TODAY, NOON);
    if (t % 60 === 0) expect(count(await states(), 'red')).toBeLessThanOrEqual(2);
  }
  expect((await db.notifications.list()).length).toBeGreaterThan(notes);
  expect((await db.serviceRecords.list()).length).toBeGreaterThan(services);
}, 120000);
