import type { WorkShare } from './core/types';
import { parseDecimal } from './core/numbers';
import type { ReadingError } from './services/motoReadings';
import { t } from './i18n/uz';

export type ShareRow = { operationTypeId: string; hours: string };

export function readingErrorMessage(error: ReadingError): string {
  return t.hours.readingErrors[error];
}

/** Kiritilgan soatlar yig'indisi (noto'g'ri qatorlar 0 hisoblanadi). */
export function sharesSum(rows: ShareRow[]): number {
  return rows.reduce((s, r) => s + (parseDecimal(r.hours) ?? 0), 0);
}

/**
 * Qatorlarni WorkShare ga o'giradi. Bitta qatorda bo'sh soat -> 0 (servis jismoniy soatni o'zi qo'yadi).
 * Yaroqsiz bo'lsa null.
 */
export function buildShares(rows: ShareRow[]): WorkShare[] | null {
  if (rows.length === 0) return null;
  const out: WorkShare[] = [];
  for (const r of rows) {
    if (!r.operationTypeId) return null;
    const blank = r.hours.trim() === '';
    if (blank && rows.length === 1) {
      out.push({ operationTypeId: r.operationTypeId, hours: 0 });
      continue;
    }
    const h = parseDecimal(r.hours);
    if (h === null || h < 0) return null;
    out.push({ operationTypeId: r.operationTypeId, hours: h });
  }
  return out;
}

/** Hisoblangan jismoniy ish soati; ko'rsatkich yaroqsiz yoki oldingisidan kam bo'lsa null. */
export function physHoursPreview(readingText: string, previous: number): number | null {
  const r = parseDecimal(readingText);
  if (r === null || r < previous) return null;
  return Math.round((r - previous) * 100) / 100;
}
