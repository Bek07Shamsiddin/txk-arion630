import AsyncStorage from '@react-native-async-storage/async-storage';
import { db, initDb } from '../../lib/db';
import { refreshAlerts } from '../../lib/services/alerts';
import { recordMotoReading } from '../../lib/services/motoReadings';
import { recordService } from '../../lib/services/service';
import { registerTractor } from '../../lib/services/tractors';

const at = (date: string) => jest.setSystemTime(new Date(`${date}T12:00:00`));

async function setup(reading: number) {
  at('2026-03-10');
  const t = await registerTractor({
    model: 'Test',
    serialNumber: 'E-' + Math.random(),
    registrationDate: '2026-03-01',
    location: '',
    operatorName: '',
    photoUri: null,
    initialReading: 245,
  });
  const r = await recordMotoReading({
    tractorId: t.id,
    date: '2026-03-10',
    reading,
    shares: [{ operationTypeId: 'ref', hours: 0 }],
    fuelLiters: null,
    note: null,
    userId: 'u1',
  });
  expect(r.ok).toBe(true);
  return t;
}

const kinds = async (tractorId: string) =>
  (await db.notifications.list()).filter((n) => n.tractorId === tractorId).map((n) => n.kind);

beforeEach(async () => {
  jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate', 'setTimeout'] });
  await AsyncStorage.clear();
  await initDb();
  await db.operationTypes.insert({ name: 'Ref', fuelLph: 18, source: 'test', verified: true } as any);
  const ops = await db.operationTypes.list();
  const ref = ops[ops.length - 1];
  await db.operationTypes.replaceAll([...ops.slice(0, -1), { ...ref, id: 'ref' }]);
});

afterEach(() => jest.useRealTimers());

test("muddati o'tdi, kichik: eslatma ham, eskalatsiya ham yo'q (0-kun)", async () => {
  const t = await setup(260); // T250: 10 soat o'tdi < 25
  const k = await kinds(t.id);
  expect(k).toContain('service_overdue');
  expect(k).not.toContain('service_reminder');
  expect(k).not.toContain('escalation');
});

test("TXK bajarilmadi → har kuni bitta eslatma, 3-kunda eskalatsiya", async () => {
  const t = await setup(260);
  at('2026-03-11');
  expect((await refreshAlerts(t.id, '2026-03-11')).map((n) => n.kind)).toEqual(['service_reminder']);
  expect(await refreshAlerts(t.id, '2026-03-11')).toEqual([]);
  at('2026-03-13');
  const k = (await refreshAlerts(t.id, '2026-03-13')).map((n) => n.kind).sort();
  expect(k).toEqual(['escalation', 'service_reminder']);
  expect(await refreshAlerts(t.id, '2026-03-13')).toEqual([]);
});

test("soat chegarasidan oshsa darhol eskalatsiya", async () => {
  const t = await setup(280); // 30 soat o'tdi ≥ 25
  expect(await kinds(t.id)).toContain('escalation');
});

test("TXK bajarildi → keyingi intervalga o'tadi, eslatma to'xtaydi", async () => {
  const t = await setup(260);
  at('2026-03-11');
  await recordService({
    tractorId: t.id,
    levelCode: 'T250',
    date: '2026-03-11',
    durationHours: 1,
    usedParts: [],
    note: null,
    photoUris: [],
    userId: 'u1',
  });
  at('2026-03-12');
  const created = await refreshAlerts(t.id, '2026-03-12');
  expect(created.filter((n) => n.levelCode === 'T250').map((n) => n.kind)).toEqual([]);
});
