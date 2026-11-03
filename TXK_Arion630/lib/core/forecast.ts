export type DailyEquiv = { date: string; equivHours: number };

const DAY_MS = 86_400_000;

function dayNumber(date: string): number {
  const [y, m, d] = date.split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / DAY_MS);
}

function dayToString(n: number): string {
  return new Date(n * DAY_MS).toISOString().slice(0, 10);
}

/**
 * Kunlik ekvivalent-soat intensivligi (EMA). Oyna: `today` dan oldingi `windowDays` kalendar kun
 * (today kirmaydi). Yozuvsiz kun = 0; yozuvli kunlar < minDays → null.
 */
export function dailyIntensity(
  daily: DailyEquiv[],
  today: string,
  windowDays = 14,
  alpha = 0.3,
  minDays = 3,
): number | null {
  const t = dayNumber(today);
  const sums = new Map<number, number>();
  for (const e of daily) {
    const n = dayNumber(e.date);
    if (n < t - windowDays || n > t - 1) continue;
    sums.set(n, (sums.get(n) ?? 0) + e.equivHours);
  }
  if (sums.size < minDays) return null;
  const first = Math.min(...sums.keys());
  let ema = sums.get(first)!;
  for (let n = first + 1; n <= t - 1; n++) {
    ema = alpha * (sums.get(n) ?? 0) + (1 - alpha) * ema;
  }
  return ema;
}

export function forecastDue(
  remainingHours: number,
  intensity: number | null,
  today: string,
): { days: number; date: string } | null {
  if (remainingHours <= 0) return { days: 0, date: today };
  if (intensity === null || intensity <= 0) return null;
  const days = Math.ceil(remainingHours / intensity);
  return { days, date: dayToString(dayNumber(today) + days) };
}
