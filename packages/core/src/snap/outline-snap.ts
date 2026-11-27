// Přichytávání k obrysům desek a otvorů v deskách (základ 20; katalog kreslení 2.1–2.4): roh, střed hrany,
// hrana (i kolmo z předchozího bodu) a průsečík hrany s jinou hranou nebo s lícem stěny. Rohy obrysů
// jsou i výchozí body pomocných čar (vodorovně / svisle). Stejné pořadí priorit jako u stěn (základ 7).
import { add, dist, dot, mul, nearestOnPath, pathIntersections, sub, tangentAt } from '../geometry/index.ts';
import type { Path, Vec2 } from '../geometry/index.ts';
import type { Id } from '../ids/index.ts';
import type { Model } from '../model/types.ts';
import { allSlabs } from '../slab/queries.ts';
import type { WallGeometry } from '../wall/geometry.ts';
import { candidate } from './candidates.ts';
import { roundOnFace } from './face-snap.ts';
import type { SnapCandidate, SnapCandidateKind } from './types.ts';

/** Obrys, ke kterému se dá přichytit: deska nebo otvor v desce. */
export interface SnapOutline {
  readonly outline: 'slab' | 'slabOpening';
  readonly ownerId: Id;
  readonly points: readonly Vec2[];
}

/** Obrysy desek a otvorů v deskách podlaží (bez prvků v `exclude`, např. právě tažených). */
export function snapOutlines(model: Model, storeyId: Id, exclude?: ReadonlySet<Id>): SnapOutline[] {
  const slabs = allSlabs(model)
    .filter((s) => s.storeyId === storeyId && !exclude?.has(s.id))
    .map((s) => ({ outline: 'slab' as const, ownerId: s.id, points: s.outline }));
  const holes = Object.values(model.slabOpenings)
    .filter((o) => o.storeyId === storeyId && !exclude?.has(o.id))
    .map((o) => ({ outline: 'slabOpening' as const, ownerId: o.id, points: o.outline }));
  return [...slabs, ...holes];
}

/** Hrany obrysu jako úsečky. */
export function outlineEdges(points: readonly Vec2[]): Path[] {
  return points.map((a, i) => ({ kind: 'line', start: a, end: points[(i + 1) % points.length] as Vec2 }));
}

const LABELS: Partial<Record<SnapCandidateKind, string>> = {
  endpoint: 'roh',
  midpoint: 'střed hrany',
  face: 'hrana',
  perpendicular: 'kolmo k hraně',
};

function make(p: Vec2, kind: SnapCandidateKind, ownerId: Id): SnapCandidate {
  const c = candidate(p, kind);
  return { ...c, label: LABELS[kind] ?? c.label, ownerId };
}

function foot(e: Path, from: Vec2): Vec2 | null {
  if (e.kind !== 'line') return null;
  const d = tangentAt(e, 'start');
  const t = dot(sub(from, e.start), d);
  return t >= 0 && t <= dist(e.start, e.end) ? add(e.start, mul(d, t)) : null;
}

function oneOutline(o: SnapOutline, raw: Vec2, tol: number, from: Vec2 | null): SnapCandidate[] {
  const out: SnapCandidate[] = [];
  const near = (p: Vec2) => dist(p, raw) <= tol;
  for (const p of o.points) if (near(p)) out.push(make(p, 'endpoint', o.ownerId));
  for (const e of outlineEdges(o.points)) {
    if (e.kind !== 'line') continue;
    const m = mul(add(e.start, e.end), 0.5);
    if (near(m)) out.push(make(m, 'midpoint', o.ownerId));
    const hit = nearestOnPath(e, raw);
    if (hit.distance <= tol) out.push(make(roundOnFace(e, hit.point, from), 'face', o.ownerId));
    const f = from ? foot(e, from) : null;
    if (f && near(f)) out.push(make(f, 'perpendicular', o.ownerId));
  }
  return out;
}

function crossings(outlines: readonly SnapOutline[], geoms: readonly WallGeometry[], raw: Vec2, tol: number) {
  const out: SnapCandidate[] = [];
  const push = (p: Vec2, id: Id) => {
    if (dist(p, raw) <= tol) out.push(make(p, 'intersection', id));
  };
  const near = (e: Path) => nearestOnPath(e, raw).distance <= tol;
  const edges = outlines.map((o) => outlineEdges(o.points).filter(near));
  outlines.forEach((o, i) => {
    for (const e of edges[i] ?? []) {
      for (let j = i + 1; j < outlines.length; j++)
        for (const f of edges[j] ?? []) for (const p of pathIntersections(e, f, 1)) push(p, o.ownerId);
      for (const g of geoms)
        for (const face of [g.faces.ref, g.faces.opp])
          for (const p of pathIntersections(e, face, 1)) push(p, o.ownerId);
    }
  });
  return out;
}

/** Kandidáti přichycení z obrysů desek a otvorů v dosahu kurzoru (řadí volající spolu se stěnami). */
export function outlineCandidates(
  outlines: readonly SnapOutline[],
  geoms: readonly WallGeometry[],
  raw: Vec2,
  tol: number,
  from: Vec2 | null = null,
): SnapCandidate[] {
  return [...outlines.flatMap((o) => oneOutline(o, raw, tol, from)), ...crossings(outlines, geoms, raw, tol)];
}

/** Rohy obrysů – výchozí body pomocných čar. */
export const outlinePoints = (outlines: readonly SnapOutline[]): Vec2[] => outlines.flatMap((o) => o.points);
