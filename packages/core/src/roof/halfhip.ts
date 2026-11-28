// Polovalba (rozhodnutí 11, S2): hrana je do výšky zlomu štít (svislá rovina), nad zlomem valba se sklonem
// hrany. Výška zlomu se měří od referenční čáry (jako „výška štítu“; v Archicadu polovalba = štít do výšky
// + valbová rovina nad ním). V kostře hrana stojí do výšky zlomu a pak se posouvá (skeleton-wave.ts).
import type { Vec2 } from '../geometry/index.ts';
import type { Vec3 } from '../covering/frame.ts';
import { meet } from './corners.ts';
import type { EdgeLine } from './edge-lines.ts';

/** Obrys roviny polovalby rozdělený ve výšce zlomu na štít (dole) a valbu (nahoře, začíná zlomem). */
export function splitHalfHip(loop: readonly Vec3[], lift: number): { gable: Vec3[]; hip: Vec3[] } | null {
  const at = loop.map((p, k) => (k >= 2 && Math.abs(p.z - lift) < 1 ? k : -1)).filter((k) => k >= 0);
  const b1 = at[0];
  const b0 = at[at.length - 1];
  if (b1 === undefined || b0 === undefined || b1 === b0) return null;
  return {
    gable: [...loop.slice(0, b1 + 1), ...loop.slice(b0)],
    hip: [loop[b0] as Vec3, ...loop.slice(b1, b0)],
  };
}

/** Je bod na zlomu polovalby hrany e (na její přímce ve výšce zlomu, z = výška nad ref. čárou)? */
export const onBreak = (e: EdgeLine, q: Vec3): boolean =>
  e.halfhip && e.contains(q) && Math.abs(q.z - e.lift) < 1;

/**
 * Bod zlomu posunutý o přesah štítu: průsečík nároží mezi valbou polovalby h a sousední rovinou o se svislou
 * rovinou štítu za přesahem – obě roviny ho spočítají stejně, takže na sebe navazují.
 */
export function breakCorner(edges: readonly EdgeLine[], q: Vec2, h: number, o: number): Vec2 {
  const a = edges[h] as EdgeLine;
  const b = edges[o];
  const shifted = { x: q.x - a.n.x * a.overhang, y: q.y - a.n.y * a.overhang };
  if (!b) return shifted;
  const m = { x: a.tan * a.n.x - b.tan * b.n.x, y: a.tan * a.n.y - b.tan * b.n.y };
  const k = a.tan * a.c - a.lift - (b.tan * b.c - b.lift);
  return meet(m, k, a.n, a.c - a.overhang) ?? shifted;
}
