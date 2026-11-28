// Úchopy vybraných prvků v řezu (pokyn uživatele 2026-11-27; pravidla-interakce → základ 25, Revit „shape
// handles“, Archicad horké body): horní a spodní hrana stěny, desky a otvoru, uprostřed plochy prvku na
// výkrese. Přichytávání při tažení: úrovně podlaží a vodorovné hrany ostatních prvků v řezu.
import type { Id } from '../ids/index.ts';
import type { Model } from '../model/types.ts';
import { edgeLevel, edgeMeasure, EDGES, type Edge } from './edge-level.ts';
import { sectionShapes, type SectionShape } from './pick.ts';
import type { Section } from './types.ts';

export interface SectionGrip {
  readonly elementId: Id;
  readonly edge: Edge;
  /** Poloha na výkrese řezu (u mm od levého okraje, z mm nad ±0,000). */
  readonly u: number;
  readonly z: number;
  /** Co se táhne (Výška, Spodek, Horní líc, Parapet…) a hodnota v mm. */
  readonly label: string;
  readonly value: number;
}

/** Plochy prvku nejblíž pozorovateli (řezané před pohledovými). */
function nearest(shapes: readonly SectionShape[], id: Id): SectionShape | null {
  const own = shapes.filter((x) => x.id === id).sort((a, b) => a.depth - b.depth);
  return own[0] ?? null;
}

/** Úchopy vybraných prvků, které řez ukazuje. */
export function sectionGrips(m: Model, s: Section, ids: readonly Id[]): SectionGrip[] {
  const shapes = sectionShapes(m, s);
  const out: SectionGrip[] = [];
  for (const id of ids) {
    const sh = nearest(shapes, id);
    if (!sh) continue;
    const us = sh.shapes.flatMap((p) => p.outer.map((q) => q.x));
    const u = (Math.min(...us) + Math.max(...us)) / 2;
    for (const edge of EDGES) {
      const z = edgeLevel(m, id, edge);
      const ms = edgeMeasure(m, id, edge);
      out.push({ elementId: id, edge, u, z, label: ms.label, value: Math.round(z - ms.ref) });
    }
  }
  return out;
}

export interface SnapLevel {
  readonly z: number;
  /** Název úrovně podlaží, nebo „hrana“. */
  readonly label: string;
}

/** Výšky, ke kterým se úchop přichytí: úrovně podlaží a vodorovné hrany ostatních prvků řezu. */
export function sectionSnapLevels(m: Model, s: Section, excludeId: Id): SnapLevel[] {
  const out = new Map<number, SnapLevel>();
  for (const st of Object.values(m.storeys))
    out.set(Math.round(st.elevation), { z: st.elevation, label: st.name });
  for (const x of sectionShapes(m, s)) {
    if (x.id === excludeId) continue;
    for (const p of x.shapes)
      p.outer.forEach((q, i) => {
        const n = p.outer[(i + 1) % p.outer.length];
        const key = Math.round(q.y);
        if (n && Math.abs(n.y - q.y) < 0.5 && !out.has(key)) out.set(key, { z: q.y, label: 'hrana' });
      });
  }
  return [...out.values()].sort((a, b) => a.z - b.z);
}

/** Nejbližší výška k přichycení do tolerance (mm výkresu), nebo null. */
export function snapLevel(levels: readonly SnapLevel[], z: number, tol: number): SnapLevel | null {
  let best: SnapLevel | null = null;
  for (const l of levels)
    if (Math.abs(l.z - z) <= tol && (!best || Math.abs(l.z - z) < Math.abs(best.z - z))) best = l;
  return best;
}
