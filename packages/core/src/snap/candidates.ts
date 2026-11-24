// Kandidáti přichycení u kurzoru: konec → průsečík → střed → líc (i kolmo) → osa
// (katalog kreslení 2.1–2.2). Pořadí bere z tabulky průřezových pravidel (základ 7).
import {
  add,
  dist,
  dot,
  endPoint,
  mul,
  nearestOnPath,
  pathIntersections,
  pointAt,
  sub,
  tangentAt,
  type Path,
  type Vec2,
} from '../geometry/index.ts';
import type { Id } from '../ids/index.ts';
import { rulesFor } from '../rules/cross-rules.ts';
import type { WallGeometry } from '../wall/geometry.ts';
import type { WallFace } from '../wall/types.ts';
import { rayFaceCandidates, roundOnFace } from './face-snap.ts';
import type { SnapCandidate, SnapCandidateKind } from './types.ts';

const LABELS: Record<SnapCandidateKind, string> = {
  endpoint: 'konec',
  intersection: 'průsečík',
  midpoint: 'střed',
  face: 'líc',
  perpendicular: 'kolmo k líci',
  axis: 'osa',
};

function priorityOf(kind: SnapCandidateKind): number {
  const order = rulesFor('wall').snaps;
  const i = order.indexOf(kind === 'perpendicular' ? 'face' : kind);
  return i < 0 ? order.length : i;
}

const OUTER: readonly WallFace[] = ['ref', 'opp'];

function candidate(point: Vec2, kind: SnapCandidateKind, wallId?: Id, face?: WallFace): SnapCandidate {
  return { point, kind, label: LABELS[kind], priority: priorityOf(kind), wallId, face };
}

/** Pata kolmice z bodu na přímý líc (jen uvnitř líce). */
function perpendicularFoot(face: Path, from: Vec2): Vec2 | null {
  if (face.kind !== 'line') return null;
  const d = tangentAt(face, 'start');
  const t = dot(sub(from, face.start), d);
  if (t < 0 || t > dist(face.start, face.end)) return null;
  return add(face.start, mul(d, t));
}

function wallCandidates(g: WallGeometry, raw: Vec2, tol: number, from: Vec2 | null): SnapCandidate[] {
  const out: SnapCandidate[] = [];
  const near = (p: Vec2) => dist(p, raw) <= tol;
  for (const f of OUTER) {
    const face = g.faces[f];
    for (const end of ['start', 'end'] as const) {
      const p = endPoint(face, end);
      if (near(p)) out.push(candidate(p, 'endpoint', g.wallId, f));
    }
    const m = pointAt(face, 0.5);
    if (near(m)) out.push(candidate(m, 'midpoint', g.wallId, f));
    const hit = nearestOnPath(face, raw);
    if (hit.distance <= tol) out.push(candidate(roundOnFace(face, hit.point, from), 'face', g.wallId, f));
    const foot = from ? perpendicularFoot(face, from) : null;
    if (foot && near(foot)) out.push(candidate(foot, 'perpendicular', g.wallId, f));
  }
  const axis = nearestOnPath(g.faces.axis, raw);
  if (axis.distance <= tol) out.push(candidate(axis.point, 'axis', g.wallId, 'axis'));
  return out;
}

function intersections(geoms: readonly WallGeometry[], raw: Vec2, tol: number): SnapCandidate[] {
  const out: SnapCandidate[] = [];
  for (let i = 0; i < geoms.length; i++) {
    for (let j = i + 1; j < geoms.length; j++) {
      const a = geoms[i] as WallGeometry;
      const b = geoms[j] as WallGeometry;
      for (const fa of OUTER)
        for (const fb of OUTER)
          for (const p of pathIntersections(a.faces[fa], b.faces[fb], 1)) {
            if (dist(p, raw) <= tol) out.push(candidate(p, 'intersection', a.wallId, fa));
          }
    }
  }
  return out;
}

/** Všichni kandidáti v dosahu, seřazení podle priority a vzdálenosti, bez duplicit. */
export function snapCandidates(
  geoms: readonly WallGeometry[],
  raw: Vec2,
  tol: number,
  from: Vec2 | null = null,
  ray?: { prevDir: number | null; orthoOnly: boolean },
): SnapCandidate[] {
  const all = [...geoms.flatMap((g) => wallCandidates(g, raw, tol, from)), ...intersections(geoms, raw, tol)];
  if (from && ray) {
    const priority = priorityOf('face') - 0.5;
    all.push(...rayFaceCandidates(geoms, raw, tol, { from, ...ray, priority }));
  }
  all.sort((a, b) => a.priority - b.priority || dist(a.point, raw) - dist(b.point, raw));
  const out: SnapCandidate[] = [];
  for (const c of all) {
    const dup = out.some(
      (o) => dist(o.point, c.point) < 1 && (o.priority <= c.priority || o.kind === c.kind),
    );
    if (!dup) out.push(c);
  }
  return out;
}

/** Rohy obrysů stěn (pro pomocné čáry vodorovně / svisle). */
export function outlineCorners(geoms: readonly WallGeometry[]): Vec2[] {
  return geoms.flatMap((g) => OUTER.flatMap((f) => [g.faces[f].start, g.faces[f].end]));
}
