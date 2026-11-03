import { todayLocal } from '../core/dates';
import { db } from '../db';
import { DEMO_TRACTORS } from '../db/demoSeed';
import { recordMotoReading } from '../services/motoReadings';
import { recordService } from '../services/service';
import { getTractorView } from '../services/tractors';

// Jonli ish: har TICK_MS da 1 ish soati o'tadi; kunduzi (06–20) traktorlar ishlaydi, kechasi to'xtaydi.
export const TICK_MS = 5000;
const OPS = ['plowing', 'cultivation', 'sowing', 'transport', 'disking'];
const listeners = new Set<() => void>();
export const onLiveTick = (fn: () => void) => {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
};

let simHour = new Date().getHours();
let started = false;
let busy = false;

async function tick(): Promise<void> {
  simHour = (simHour + 1) % 24;
  const day = simHour >= 6 && simHour < 20;
  const users = await db.users.list();
  const mechanic = users.find((u) => u.role === 'technician');
  const tractors = await db.tractors.list();
  const readings = await db.motoReadings.list();
  const today = todayLocal();
  for (const d of DEMO_TRACTORS) {
    const tr = tractors.find((x) => x.serialNumber === d.serialNumber);
    const op = users.find((u) => u.name === d.operatorName);
    if (!tr || !op) continue;
    const mine = readings.filter((r) => r.tractorId === tr.id);
    const first = mine.length === 0;
    if (!first && !day) continue;
    const last = first ? tr.initialReading : Math.max(...mine.map((r) => r.reading));
    await recordMotoReading({
      tractorId: tr.id,
      date: today,
      reading: first ? d.startReading : last + 1,
      shares: [{ operationTypeId: OPS[(simHour + d.startReading) % OPS.length], hours: 0 }],
      fuelLiters: null,
      note: first ? null : `Daladagi ish, ${simHour}:00`,
      userId: op.id,
      confirmOver24h: true,
    });
    // Eskalatsiyadan keyin mexanik TXK ni bajaradi → keyingi intervalga o'tiladi.
    const escalated = (await db.notifications.list()).filter(
      (n) => n.tractorId === tr.id && n.kind === 'escalation' && !n.isRead,
    );
    if (!mechanic || escalated.length === 0) continue;
    const v = await getTractorView(tr.id, today);
    const level = (await db.regulation.list()).find((l) => l.code === v.recommended);
    if (!level) continue;
    await recordService({
      tractorId: tr.id,
      levelCode: level.code,
      date: today,
      durationHours: level.durationHours,
      usedParts: level.parts.map((p) => ({ name: p.name, quantity: p.quantity })),
      note: 'Eskalatsiyadan keyin bajarildi',
      photoUris: [],
      userId: mechanic.id,
    });
    for (const n of escalated) await db.notifications.update(n.id, { isRead: true });
  }
}

export function startFieldWork(): void {
  if (started) return;
  started = true;
  setInterval(async () => {
    if (busy) return;
    busy = true;
    try {
      await tick();
      listeners.forEach((fn) => fn());
    } catch {
      // jonli ish xatosi ilovani to'xtatmasin
    } finally {
      busy = false;
    }
  }, TICK_MS);
}
