import type { RegulationLevel } from './core/types';
import { parseDecimal } from './core/numbers';

export type PartRow = { name: string; quantity: string };

/** Reglamentdagi qismlar ro'yxati bilan oldindan to'ldirish (miqdori tahrirlanadi). */
export function prefillParts(level: Pick<RegulationLevel, 'parts'> | undefined | null): PartRow[] {
  return (level?.parts ?? []).map((p) => ({ name: p.name, quantity: String(p.quantity) }));
}

/** Butunlay bo'sh qatorlar tashlanadi; noto'g'ri qator bo'lsa null. */
export function parseUsedParts(rows: PartRow[]): { name: string; quantity: number }[] | null {
  const out: { name: string; quantity: number }[] = [];
  for (const r of rows) {
    const name = r.name.trim();
    if (!name && !r.quantity.trim()) continue;
    const q = parseDecimal(r.quantity);
    if (!name || q === null || q <= 0) return null;
    out.push({ name, quantity: q });
  }
  return out;
}
