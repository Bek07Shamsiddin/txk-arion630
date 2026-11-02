/** Texnik tayyorlik koeffitsienti K_tt = ish / (ish + xizmat + bekor). */
export function technicalReadiness(work: number, service: number, downtime: number): number | null {
  const total = work + service + downtime;
  return total > 0 ? work / total : null;
}

/** Bekor turish soatlari = (yopilgan − ochilgan) kun hisobida × smena soati. */
export function downtimeHours(openedAt: string, closedAt: string, shiftHoursPerDay: number): number {
  const ms = new Date(closedAt).getTime() - new Date(openedAt).getTime();
  return (ms / 86_400_000) * shiftHoursPerDay;
}
