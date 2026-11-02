import type { CoreSettings, OperationType, RegulationLevel } from './types';

export const DEFAULT_SETTINGS: CoreSettings = {
  nominalFuelLph: 18,
  gamma: 1.0,
  calendarMonths: 12,
  dueSoonFraction: 0.1,
  reorderBufferDays: 3,
  shiftHoursPerDay: 10,
  kMin: 0.2,
  kMax: 2.0,
};

const SOURCE = 'Taxminiy — manba bilan tasdiqlansin';

const op = (id: string, name: string, fuelLph: number): OperationType => ({
  id,
  name,
  fuelLph,
  source: SOURCE,
  verified: false,
});

export const DEFAULT_OPERATION_TYPES: OperationType[] = [
  op('plowing', 'Haydash', 24),
  op('chisel', 'Chizellash', 23),
  op('disking', 'Diskalash', 21),
  op('cultivation', 'Kultivatsiya', 17),
  op('sowing', 'Ekish', 13),
  op('transport', 'Transport', 10),
  op('idle', 'Salt ishlash', 4),
];

const LEAD_DAYS = 7;
const part = (name: string) => ({ name, quantity: 1, leadDays: LEAD_DAYS });

// Qismlar nomi eski reglament jadvalidagi parts_needed dan.
export const DEFAULT_REGULATION: RegulationLevel[] = [
  {
    code: 'O50',
    name: 'Obkatka TXK-50',
    intervalHours: 50,
    kind: 'once',
    covers: [],
    parts: [part('Dvigatel moyi'), part('Moy filtri'), part('Havo filtri')],
    durationHours: 2,
  },
  {
    code: 'O100',
    name: 'Obkatka TXK-100',
    intervalHours: 100,
    kind: 'once',
    covers: [],
    parts: [part('Dvigatel moyi'), part('Moy filtri'), part('Havo filtri')],
    durationHours: 2,
  },
  {
    code: 'T250',
    name: 'TXK-1: dvigatel moyi va filtri',
    intervalHours: 250,
    kind: 'periodic',
    covers: [],
    parts: [part('Dvigatel moyi'), part('Moy filtri')],
    durationHours: 1,
  },
  {
    code: 'T500',
    name: "TXK-2: yoqilg'i va havo filtrlari",
    intervalHours: 500,
    kind: 'periodic',
    covers: ['T250'],
    parts: [part("Yoqilg'i filtri"), part('Havo filtri')],
    durationHours: 1.5,
  },
  {
    code: 'T1000',
    name: 'TXK-3: transmissiya moyi',
    intervalHours: 1000,
    kind: 'periodic',
    covers: ['T500', 'T250'],
    parts: [part('Transmissiya moyi'), part('Transmissiya filtri')],
    durationHours: 3,
  },
];
