export type OperationType = {
  id: string;
  name: string;
  fuelLph: number;
  source: string;
  verified: boolean;
};

export type WorkShare = { operationTypeId: string; hours: number };

export type PartSpec = { name: string; quantity: number; leadDays: number };

export type RegulationLevel = {
  code: string;
  name: string;
  intervalHours: number;
  kind: 'once' | 'periodic';
  covers: string[];
  parts: PartSpec[];
  durationHours: number;
};

export type CoreSettings = {
  nominalFuelLph: number;
  gamma: number;
  calendarMonths: number;
  dueSoonFraction: number;
  reorderBufferDays: number;
  shiftHoursPerDay: number;
  kMin: number;
  kMax: number;
};

export type LevelCounter = {
  code: string;
  physSince: number;
  equivSince: number;
  lastServiceDate: string;
  done: boolean;
};
