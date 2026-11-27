// Souřadnice řezu: u = vodorovně po výkrese (zleva doprava, jak ho vidí pozorovatel), z = výška nad ±0,000,
// d = vzdálenost za rovinou řezu ve směru pohledu. Kresba řezu je v mm (u, z), osa Y výkresu jde nahoru.
import { cross, dist, dot, leftNormal, norm, sub, type Vec2 } from '../geometry/index.ts';
import type { CutPlane3d } from '../view-3d/types.ts';
import type { Section } from './types.ts';

export interface SectionFrame {
  /** Bod čáry, kde je u = 0 (levý okraj výkresu). */
  readonly origin: Vec2;
  /** Směr osy u v půdorysu (vpravo na výkrese). */
  readonly right: Vec2;
  /** Směr pohledu v půdorysu (od pozorovatele do hloubky). */
  readonly look: Vec2;
  /** Délka čáry = šířka výkresu (mm). */
  readonly length: number;
  /** Hloubka pohledu (mm), Infinity = bez omezení. */
  readonly depth: number;
}

/**
 * Pohled doleva od směru start → end: pozorovatel stojí vpravo, osa u jde od startu ke konci.
 * Pohled doprava: osa u jde od konce ke startu (vpravo na výkrese je vždy pravá ruka pozorovatele).
 */
export function sectionFrame(s: Pick<Section, 'start' | 'end' | 'direction' | 'depth'>): SectionFrame {
  const d = norm(sub(s.end, s.start));
  const left = s.direction === 'left';
  const look = left ? leftNormal(d) : { x: d.y, y: -d.x };
  return {
    origin: left ? s.start : s.end,
    right: left ? d : { x: -d.x, y: -d.y },
    look,
    length: dist(s.start, s.end),
    depth: s.depth ?? Number.POSITIVE_INFINITY,
  };
}

/** Bod půdorysu → (u, d). */
export function toFrame(f: SectionFrame, p: Vec2): { u: number; d: number } {
  const v = sub(p, f.origin);
  return { u: dot(v, f.right), d: dot(v, f.look) };
}

/**
 * Úseky přímky řezu (parametr u, oříznuté na délku čáry) uvnitř obrysů (pravidlo sudé-liché přes všechny
 * smyčky – díry se odečtou samy, polootevřené vrcholy). Hrany ležící přímo na přímce se nepočítají.
 */
export function lineIntervals(f: SectionFrame, rings: readonly (readonly Vec2[])[]): [number, number][] {
  const ts = rings.flatMap((r) => crossings(f, r));
  ts.sort((x, y) => x - y);
  const out: [number, number][] = [];
  for (let i = 0; i + 1 < ts.length; i += 2) {
    const u0 = Math.max(0, ts[i] as number);
    const u1 = Math.min(f.length, ts[i + 1] as number);
    if (u1 - u0 > 1e-6) out.push([u0, u1]);
  }
  return out;
}

function crossings(f: SectionFrame, poly: readonly Vec2[]): number[] {
  const ts: number[] = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i] as Vec2;
    const b = poly[(i + 1) % poly.length] as Vec2;
    const sa = cross(f.right, sub(a, f.origin));
    const sb = cross(f.right, sub(b, f.origin));
    if (sa > 0 === sb > 0) continue;
    const k = sa / (sa - sb);
    ts.push(dot(sub({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k }, f.origin), f.right));
  }
  return ts;
}

/** Pásmo pohledu v půdorysu: od čáry do hloubky (nekonečná hloubka = velké číslo). */
export function viewZone(f: SectionFrame, from = 0): Vec2[] {
  const far = Number.isFinite(f.depth) ? f.depth : 1e7;
  const at = (u: number, d: number): Vec2 => ({
    x: f.origin.x + f.right.x * u + f.look.x * d,
    y: f.origin.y + f.right.y * u + f.look.y * d,
  });
  return [at(0, from), at(f.length, from), at(f.length, far), at(0, far)];
}

/**
 * Rovina řezu pro 3D okno (požadavek „Řez A / Řez B“ ve 3D): zůstane část ve směru pohledu.
 * Pohled (fasáda) rovinou nic neřeže – 3D ji může použít jako pohled kamery.
 */
export function sectionCutPlane3d(s: Section): CutPlane3d {
  const f = sectionFrame(s);
  return { origin: { x: s.start.x, y: s.start.y, z: 0 }, normal: { x: f.look.x, y: f.look.y, z: 0 } };
}
