import { RegulationLevel } from './types';

export function needsReorder(
  level: RegulationLevel,
  remainingHours: number,
  forecastDays: number | null,
  hasOpenRequest: boolean,
  bufferDays: number,
): boolean {
  if (hasOpenRequest) return false;
  if (remainingHours <= 0) return true;
  if (forecastDays === null) return false;
  const lead = Math.max(0, ...level.parts.map((p) => p.leadDays));
  return forecastDays <= lead + bufferDays;
}
