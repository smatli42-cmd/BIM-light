// Souřadnice řezu: u = vodorovně po výkrese (zleva doprava, jak ho vidí pozorovatel), z = výška nad ±0,000,
// d = vzdálenost za rovinou řezu ve směru pohledu. Kresba řezu je v mm (u, z), osa Y výkresu jde nahoru.
// Zalomený řez (Revit „Split Segment“, Archicad zalomená čára řezu): úseky rovnoběžné s prvním úsekem jsou
// roviny řezu (každá ve své hloubce d0), kolmé úseky jsou jen zalomení – nic neřežou.
import { add, cross, dot, leftNormal, mul, norm, sub, type Vec2 } from '../geometry/index.ts';
import type { CutPlane3d } from '../view-3d/types.ts';
import { sectionLimits, type Section, type SectionPreset } from './types.ts';

/** Úsek roviny řezu: rozsah na výkrese u0–u1 a hloubka roviny d0 (vůči počátku). */
export interface SectionPart {
  readonly u0: number;
  readonly u1: number;
  readonly d0: number;
}

export interface SectionFrame {
  /** Bod, kde je u = 0 a d = 0 (levý okraj výkresu v rovině prvního úseku). */
  readonly origin: Vec2;
  /** Směr osy u v půdorysu (vpravo na výkrese). */
  readonly right: Vec2;
  /** Směr pohledu v půdorysu (od pozorovatele do hloubky). */
  readonly look: Vec2;
  /** Šířka výkresu (mm) = rozsah všech úseků. */
  readonly length: number;
  /** Hloubka pohledu za rovinou každého úseku (mm), Infinity = bez omezení. */
  readonly depth: number;
  /** Úseky roviny řezu (u rovného řezu jeden). */
  readonly parts: readonly SectionPart[];
}

const PARALLEL = 1e-6;

/** Je úsek a–b rovnoběžný se směrem d (rovina řezu)? */
export const isCutSegment = (d: Vec2, a: Vec2, b: Vec2): boolean =>
  Math.abs(cross(d, norm(sub(b, a)))) < PARALLEL;

/**
 * Pohled doleva od směru prvního úseku: pozorovatel stojí vpravo, osa u jde od začátku ke konci čáry.
 * Pohled doprava: osa u jde opačně (vpravo na výkrese je vždy pravá ruka pozorovatele).
 */
export function sectionFrame(
  s: Pick<Section, 'points' | 'direction'> & { readonly depth: number | null },
): SectionFrame {
  const pts = s.points;
  const first = pts[0] as Vec2;
  const d = norm(sub(pts[1] as Vec2, first));
  const left = s.direction === 'left';
  const look = left ? leftNormal(d) : { x: d.y, y: -d.x };
  const right = left ? d : { x: -d.x, y: -d.y };
  const raw: SectionPart[] = [];
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i] as Vec2;
    const b = pts[i + 1] as Vec2;
    if (!isCutSegment(d, a, b)) continue;
    const ua = dot(sub(a, first), right);
    const ub = dot(sub(b, first), right);
    raw.push({ u0: Math.min(ua, ub), u1: Math.max(ua, ub), d0: dot(sub(a, first), look) });
  }
  const min = Math.min(...raw.map((p) => p.u0));
  const origin = add(first, mul(right, min));
  const parts = raw.map((p) => ({ u0: p.u0 - min, u1: p.u1 - min, d0: p.d0 }));
  return {
    origin,
    right,
    look,
    length: Math.max(...parts.map((p) => p.u1)),
    depth: s.depth ?? Number.POSITIVE_INFINITY,
    parts,
  };
}

/** Bod půdorysu → (u, d). */
export function toFrame(f: SectionFrame, p: Vec2): { u: number; d: number } {
  const v = sub(p, f.origin);
  return { u: dot(v, f.right), d: dot(v, f.look) };
}

/** Bod půdorysu v souřadnicích (u, d). */
export const atFrame = (f: SectionFrame, u: number, d: number): Vec2 => ({
  x: f.origin.x + f.right.x * u + f.look.x * d,
  y: f.origin.y + f.right.y * u + f.look.y * d,
});

/**
 * Úseky přímek řezu (parametr u) uvnitř obrysů (pravidlo sudé-liché přes všechny smyčky – díry se odečtou
 * samy, polootevřené vrcholy), u každého úseku roviny ve své hloubce a oříznuté na jeho rozsah.
 * Hrany ležící přímo na přímce se nepočítají.
 */
export function lineIntervals(f: SectionFrame, rings: readonly (readonly Vec2[])[]): [number, number][] {
  const out: [number, number][] = [];
  for (const part of f.parts) {
    const origin = atFrame(f, 0, part.d0);
    const ts = rings.flatMap((r) => crossings(origin, f.right, r));
    ts.sort((x, y) => x - y);
    for (let i = 0; i + 1 < ts.length; i += 2) {
      const u0 = Math.max(part.u0, ts[i] as number);
      const u1 = Math.min(part.u1, ts[i + 1] as number);
      if (u1 - u0 > 1e-6) out.push([u0, u1]);
    }
  }
  return out;
}

function crossings(origin: Vec2, right: Vec2, poly: readonly Vec2[]): number[] {
  const ts: number[] = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i] as Vec2;
    const b = poly[(i + 1) % poly.length] as Vec2;
    const sa = cross(right, sub(a, origin));
    const sb = cross(right, sub(b, origin));
    if (sa > 0 === sb > 0) continue;
    const k = sa / (sa - sb);
    ts.push(dot(sub({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k }, origin), right));
  }
  return ts;
}

/** Pásmo pohledu úseku v půdorysu: od jeho roviny (+ `from`) do hloubky. */
export function partZone(f: SectionFrame, part: SectionPart, from = 0): Vec2[] {
  const far = part.d0 + (Number.isFinite(f.depth) ? f.depth : 1e7);
  const near = part.d0 + from;
  return [
    atFrame(f, part.u0, near),
    atFrame(f, part.u1, near),
    atFrame(f, part.u1, far),
    atFrame(f, part.u0, far),
  ];
}

/**
 * Rovina řezu pro 3D okno (požadavek „Řez A / Řez B“ ve 3D): rovina prvního úseku, zůstane část ve směru
 * pohledu. Pohled (fasáda) rovinou nic neřeže – 3D ji může použít jako pohled kamery.
 */
export function sectionCutPlane3d(s: Section): CutPlane3d {
  const f = sectionFrame(s);
  const p = s.points[0] as Vec2;
  return { origin: { x: p.x, y: p.y, z: 0 }, normal: { x: f.look.x, y: f.look.y, z: 0 } };
}

/** Souřadnice řezu s hloubkou podle stylu řezu (nebo vlastní). */
export function effectiveFrame(presets: Readonly<Record<string, SectionPreset>>, s: Section): SectionFrame {
  return sectionFrame({ ...s, depth: sectionLimits(presets, s).depth });
}
