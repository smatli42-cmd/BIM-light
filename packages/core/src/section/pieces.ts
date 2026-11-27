// Rozklad plochy s dírami na jednoduché mnohoúhelníky (primitiva výplně a šrafy díry neznají): svislé pásy
// v místech vrcholů děr – v pásu už každá díra přetne celou šířku, takže zbydou kusy bez děr.
import { clipRect, rect, type PlanePolygon } from '../covering/polygon.ts';
import type { Vec2 } from '../geometry/index.ts';

const BIG = 1e7;

export function simplePieces(p: PlanePolygon): (readonly Vec2[])[] {
  if (!p.holes.length) return [p.outer];
  const xs = [...new Set(p.holes.flat().map((q) => q.x))].sort((a, b) => a - b);
  const bounds = [-BIG, ...xs, BIG];
  const out: (readonly Vec2[])[] = [];
  for (let i = 0; i + 1 < bounds.length; i++) {
    const strip = clipRect([p], rect(bounds[i] as number, -BIG, bounds[i + 1] as number, BIG));
    // Díra, kterou pás nepřetnul celou (šikmá hrana), se zanedbá – zbyde jen obrys kusu.
    for (const s of strip) out.push(s.outer);
  }
  return out;
}

/** Všechny smyčky plochy (obrys i díry) – pro čáry a zakrývání. */
export const ringsOf = (shapes: readonly PlanePolygon[]): (readonly Vec2[])[] =>
  shapes.flatMap((s) => [s.outer, ...s.holes]);
