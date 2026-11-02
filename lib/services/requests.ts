import { db } from '../db';
import { StorageError } from '../db/storage';
import type { MechanicRequest, PartsRequest } from '../db/schema';
import { todayLocal } from '../core/dates';

export type PartsStatus = PartsRequest['status'];

const PARTS_FLOW: Record<PartsStatus, PartsStatus[]> = {
  pending: ['ordered', 'cancelled'],
  ordered: ['in_transit', 'cancelled'],
  in_transit: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
};

/** Berilgan holatdan o'tish mumkin bo'lgan holatlar. */
export function allowedPartsStatuses(status: PartsStatus): PartsStatus[] {
  return PARTS_FLOW[status];
}

export type NewPartsInput = {
  tractorId: string;
  requestedBy: string;
  urgency: PartsRequest['urgency'];
  notes: string | null;
  levelCode: string | null;
  parts: { name: string; quantity: number }[];
};

export async function createPartsRequests(input: NewPartsInput): Promise<PartsRequest[]> {
  const parts = input.parts.map((p) => ({ name: p.name.trim(), quantity: p.quantity }));
  if (parts.length === 0 || parts.some((p) => !p.name || !(p.quantity > 0))) {
    throw new StorageError("Qism nomi va soni to'g'ri bo'lishi kerak");
  }
  const now = new Date();
  const out: PartsRequest[] = [];
  for (const p of parts) {
    out.push(
      await db.partsRequests.insert({
        tractorId: input.tractorId,
        partName: p.name,
        quantity: p.quantity,
        urgency: input.urgency,
        levelCode: input.levelCode,
        status: 'pending',
        requestedBy: input.requestedBy,
        requestDate: todayLocal(now),
        deliveredAt: null,
        notes: input.notes,
        createdAt: now.toISOString(),
      }),
    );
  }
  return out;
}

export async function setPartsStatus(id: string, next: PartsStatus): Promise<PartsRequest> {
  const cur = await db.partsRequests.get(id);
  if (!cur) throw new StorageError('Yozuv topilmadi');
  if (!PARTS_FLOW[cur.status].includes(next)) {
    throw new StorageError("Bu holatga o'tkazib bo'lmaydi");
  }
  return db.partsRequests.update(id, {
    status: next,
    deliveredAt: next === 'delivered' ? new Date().toISOString() : cur.deliveredAt,
  });
}

export async function createMechanicRequest(input: {
  tractorId: string;
  problem: string;
  userId: string;
}): Promise<MechanicRequest> {
  const problem = input.problem.trim();
  if (!problem) throw new StorageError('Muammoni yozing');
  const now = new Date().toISOString();
  const req = await db.mechanicRequests.insert({
    tractorId: input.tractorId,
    problem,
    status: 'pending',
    openedAt: now,
    closedAt: null,
    userId: input.userId,
    technicianId: null,
    technicianNotes: null,
    createdAt: now,
  });
  await db.notifications.insert({
    tractorId: input.tractorId,
    kind: 'mechanic',
    levelCode: null,
    message: `Mexanik chaqirildi: ${problem}`,
    dedupeKey: `mechanic:${req.id}`,
    isRead: false,
    createdAt: now,
  });
  return req;
}

export async function acceptMechanicRequest(id: string, technicianId: string): Promise<MechanicRequest> {
  const cur = await db.mechanicRequests.get(id);
  if (!cur) throw new StorageError('Yozuv topilmadi');
  if (cur.status !== 'pending') throw new StorageError("Faqat kutilayotgan so'rovni qabul qilish mumkin");
  return db.mechanicRequests.update(id, { status: 'in_progress', technicianId });
}

export async function completeMechanicRequest(id: string, technicianNotes: string): Promise<MechanicRequest> {
  const cur = await db.mechanicRequests.get(id);
  if (!cur) throw new StorageError('Yozuv topilmadi');
  if (cur.status !== 'in_progress') throw new StorageError("Faqat jarayondagi so'rovni yakunlash mumkin");
  return db.mechanicRequests.update(id, {
    status: 'completed',
    closedAt: new Date().toISOString(),
    technicianNotes: technicianNotes.trim() || null,
  });
}
