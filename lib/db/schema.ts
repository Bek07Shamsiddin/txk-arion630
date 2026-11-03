import type { CoreSettings, WorkShare } from '../core/types';
import { DEFAULT_SETTINGS } from '../core/defaults';

export type Role = 'operator' | 'technician' | 'admin';

export type User = {
  id: string;
  name: string;
  role: Role;
  pinHash: string | null;
  active: boolean;
  createdAt: string;
};

export type Tractor = {
  id: string;
  model: string;
  serialNumber: string;
  registrationDate: string;
  location: string;
  operatorName: string;
  photoUri: string | null;
  initialReading: number;
  status: 'active' | 'maintenance' | 'inactive';
  createdAt: string;
};

export type MotoReading = {
  id: string;
  tractorId: string;
  date: string;
  reading: number;
  physHours: number;
  shares: WorkShare[];
  fuelLiters: number | null;
  equivHours: number;
  userId: string;
  note: string | null;
  createdAt: string;
};

export type ServiceRecord = {
  id: string;
  tractorId: string;
  levelCode: string;
  date: string;
  reading: number;
  durationHours: number;
  usedParts: { name: string; quantity: number }[];
  note: string | null;
  photoUris: string[];
  userId: string;
  createdAt: string;
};

export type PartsRequest = {
  id: string;
  tractorId: string;
  partName: string;
  quantity: number;
  urgency: 'urgent' | 'medium' | 'normal';
  levelCode: string | null;
  status: 'pending' | 'ordered' | 'in_transit' | 'delivered' | 'cancelled';
  requestedBy: string;
  requestDate: string;
  deliveredAt: string | null;
  notes: string | null;
  createdAt: string;
};

export type MechanicRequest = {
  id: string;
  tractorId: string;
  problem: string;
  status: 'pending' | 'in_progress' | 'completed';
  openedAt: string;
  closedAt: string | null;
  userId: string;
  technicianId: string | null;
  technicianNotes: string | null;
  createdAt: string;
};

export type DamageReport = {
  id: string;
  tractorId: string;
  description: string;
  photoUris: string[];
  date: string;
  userId: string;
  createdAt: string;
};

export type AppNotification = {
  id: string;
  tractorId: string;
  kind: 'service_soon' | 'service_overdue' | 'service_reminder' | 'escalation' | 'reorder' | 'mechanic';
  levelCode: string | null;
  message: string;
  dedupeKey: string;
  isRead: boolean;
  createdAt: string;
};

export type BackupData = {
  schemaVersion: number;
  exportedAt: string;
  collections: Record<string, unknown[]>;
  settings: CoreSettings;
};

export const SCHEMA_VERSION = 1;

export const COLLECTION_NAMES = [
  'users',
  'tractors',
  'motoReadings',
  'serviceRecords',
  'partsRequests',
  'mechanicRequests',
  'damageReports',
  'notifications',
  'operationTypes',
  'regulation',
] as const;

/** Eski formatdagi zaxirani joriy sxemaga ko'taradi. */
export function migrate(data: BackupData, fromVersion: number): BackupData {
  let d = { ...data };
  if (fromVersion < 1) {
    // v0: schemaVersion yo'q, sozlamalar bo'lmasligi mumkin.
    d = { ...d, settings: d.settings ?? { ...DEFAULT_SETTINGS }, schemaVersion: 1 };
  }
  return d;
}
