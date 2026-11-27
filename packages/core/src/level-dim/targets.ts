// Na co jde výšková kóta v řezu přichytit (Revit Spot Elevation, Archicad Level Dimension): úrovně podlaží
// (přes celý výkres) a horní / spodní hrana stěn a desek v rozsahu, kde je prvek v řezu nebo za ním vidět.
// Kóta pak odkazuje na hranu prvku, ne na souřadnici (asociativita).
import type { Id } from '../ids/index.ts';
import type { Model } from '../model/types.ts';
import { sectionContent } from '../section/content.ts';
import type { LevelRef } from './types.ts';
import { levelZ } from './value.ts';

export interface LevelTarget {
  readonly ref: LevelRef;
  readonly z: number;
  /** Rozsah po výkrese, kde hrana leží (u úrovně podlaží neomezený). */
  readonly u0: number;
  readonly u1: number;
}

export function levelTargets(model: Model, sectionId: Id): LevelTarget[] {
  const s = model.sections[sectionId];
  if (!s) return [];
  const storeys = Object.values(model.storeys).map((st) => ({
    ref: { kind: 'storey', storeyId: st.id } as LevelRef,
    z: st.elevation,
    u0: Number.NEGATIVE_INFINITY,
    u1: Number.POSITIVE_INFINITY,
  }));
  const c = sectionContent(model, s);
  const rows = [...c.cut, ...c.seen];
  const edges = rows.flatMap((r) =>
    (['top', 'bottom'] as const).flatMap((edge) => {
      const ref: LevelRef = { kind: 'edge', elementId: r.elementId, edge };
      const z = levelZ(model, ref);
      return z === null ? [] : [{ ref, z, u0: r.u0, u1: r.u1 }];
    }),
  );
  return [...edges, ...storeys];
}

/** Nejbližší cíl k bodu výkresu (u, z) do tolerance; hrana prvku má přednost před úrovní podlaží. */
export function levelTargetAt(
  targets: readonly LevelTarget[],
  u: number,
  z: number,
  tol: number,
): LevelTarget | null {
  let best: LevelTarget | null = null;
  let bestD = tol;
  for (const t of targets) {
    if (u < t.u0 - tol || u > t.u1 + tol) continue;
    const d = Math.abs(t.z - z) - (t.ref.kind === 'edge' ? 1e-3 : 0);
    if (d <= bestD) {
      best = t;
      bestD = d;
    }
  }
  return best;
}

/**
 * Cíl výškové kóty pro jeden klik (Revit Spot Elevation): hrana nebo úroveň do `tol`, jinak – když klik padl
 * do plochy prvku v řezu – bližší z jeho horní a spodní hrany. Null = klik mimo prvky i úrovně.
 */
export function levelTargetPick(
  targets: readonly LevelTarget[],
  u: number,
  z: number,
  tol: number,
): LevelTarget | null {
  const near = levelTargetAt(targets, u, z, tol);
  if (near) return near;
  let best: LevelTarget | null = null;
  let bestD = Number.POSITIVE_INFINITY;
  for (const top of targets) {
    if (top.ref.kind !== 'edge' || top.ref.edge !== 'top' || u < top.u0 || u > top.u1) continue;
    const id = top.ref.elementId;
    const bottom = targets.find(
      (t) => t.ref.kind === 'edge' && t.ref.elementId === id && t.ref.edge === 'bottom',
    );
    if (!bottom || z > top.z || z < bottom.z) continue;
    for (const t of [top, bottom]) {
      const d = Math.abs(t.z - z);
      if (d < bestD) [best, bestD] = [t, d];
    }
  }
  return best;
}
