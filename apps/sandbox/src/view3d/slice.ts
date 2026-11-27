// Tělo vrstvy stěny s otvory bez prostorových booleovských operací: výšku vrstvy rozdělíme podle spodních
// a horních hran otvorů na pásy a v každém pásu od půdorysu vrstvy odečteme půdorysy otvorů, které pásem
// procházejí (2D rozdíl mnohoúhelníků). Pás se pak jen vytáhne do výšky. Platí pro přímé i obloukové stěny.
import polygonClipping, { type MultiPolygon, type Ring } from 'polygon-clipping';
import type { Vec2 } from '@bim-light/core';

/** Otvor v půdorysu (obrys) a jeho výška nad ±0,000 (mm). */
export interface Cutter {
  readonly footprint: readonly Vec2[];
  readonly bottom: number;
  readonly top: number;
}

/** Pás tělesa: obrysy s dírami (MultiPolygon) vytažené od `z0` do `z1` (mm nad ±0,000). */
export interface Slab {
  readonly z0: number;
  readonly z1: number;
  readonly shape: MultiPolygon;
}

const EPS = 0.01;

const ring = (pts: readonly Vec2[]): Ring => pts.map((p) => [p.x, p.y]);

/** Výškové hranice pásů: spodek, vršek a hrany otvorů mezi nimi. */
export function levels(z0: number, z1: number, cutters: readonly Cutter[]): number[] {
  const inner = cutters.flatMap((c) => [c.bottom, c.top]).filter((z) => z > z0 + EPS && z < z1 - EPS);
  return [...new Set([z0, ...inner, z1])].sort((a, b) => a - b);
}

function subtract(base: MultiPolygon, holes: readonly Cutter[]): MultiPolygon {
  if (!holes.length) return base;
  try {
    return polygonClipping.difference(base, ...holes.map((h) => [ring(h.footprint)]));
  } catch {
    // Nečekaně zdegenerovaný obrys: raději těleso bez otvoru než žádné.
    return base;
  }
}

/** Rozdělí vrstvu (obrysy `polygons`, výška z0–z1) na pásy s vyříznutými otvory. */
export function sliceLayer(
  polygons: readonly (readonly Vec2[])[],
  z0: number,
  z1: number,
  cutters: readonly Cutter[],
): Slab[] {
  const loops = polygons.filter((p) => p.length >= 3);
  if (!loops.length || z1 - z0 < EPS) return [];
  const base: MultiPolygon = polygonClipping.union(loops.map((p) => [ring(p)]));
  const zs = levels(z0, z1, cutters);
  const out: Slab[] = [];
  for (let i = 0; i + 1 < zs.length; i++) {
    const a = zs[i] as number;
    const b = zs[i + 1] as number;
    const active = cutters.filter((c) => c.bottom <= a + EPS && c.top >= b - EPS);
    const shape = subtract(base, active);
    if (shape.length) out.push({ z0: a, z1: b, shape });
  }
  return out;
}

/** Plocha pásu v mm² (obrysy minus díry) – pro testy a kontrolu. */
export function shapeArea(shape: MultiPolygon): number {
  const ringArea = (r: Ring) => {
    let s = 0;
    for (let i = 0; i < r.length; i++) {
      const p = r[i] as [number, number];
      const q = r[(i + 1) % r.length] as [number, number];
      s += p[0] * q[1] - q[0] * p[1];
    }
    return Math.abs(s) / 2;
  };
  return shape.reduce((sum, poly) => {
    const [outer, ...holes] = poly;
    return sum + (outer ? ringArea(outer) : 0) - holes.reduce((h, r) => h + ringArea(r), 0);
  }, 0);
}
