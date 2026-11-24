// Jeden řešič zámků na jednom místě (katalog kreslení, část 4.6; základ 7).
// Zatím kontroluje: zamčená kóta musí mít svou hodnotu, jinak se změna odmítne a řekne proč.
import { measureDimension } from '../dimension/measure.ts';
import { LOCK_TOLERANCE, type Dimension } from '../dimension/types.ts';
import type { Id } from '../ids/index.ts';
import type { Model } from '../model/types.ts';

export interface LockViolation {
  readonly dimensionId: Id;
  readonly locked: number;
  readonly actual: number;
}

const tolerance = (d: Dimension) => (d.kind === 'angular' ? LOCK_TOLERANCE.angle : LOCK_TOLERANCE.length);

/** Zamčené kóty, které model porušuje. Platí i pro kóty ve skrytých skupinách (základ 28). */
export function lockViolations(model: Model): LockViolation[] {
  const out: LockViolation[] = [];
  for (const d of Object.values(model.dimensions)) {
    if (!d.locked) continue;
    const actual = measureDimension(model, d);
    if (!(Math.abs(actual - d.value) <= tolerance(d))) {
      out.push({ dimensionId: d.id, locked: d.value, actual });
    }
  }
  return out;
}

/** Vysvětlení pro uživatele. */
export function describeViolation(v: LockViolation): string {
  const fmt = (n: number) => (Number.isFinite(n) ? String(Math.round(n * 10) / 10) : '—');
  return `Změna se neprovedla: porušila by zamčenou kótu ${fmt(v.locked)} (vyšlo by ${fmt(v.actual)}). Kótu lze odemknout.`;
}
