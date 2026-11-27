// Líce stěn v místnosti (prvky stavby 9, základ 14): hrany obrysu místnosti (místnost vlevo) se přiřadí
// stěně, do které míří (bod 1 mm za hranou), a straně (líc ref / opp, nebo čelo volného konce). Po sobě
// jdoucí hrany téže stěny a strany tvoří úsek líce. Úsek se rozvine do roviny: u = délka po líci zleva
// doprava při pohledu z místnosti, v = výška (oblouk po délce, základ 23).
import {
  angleOf,
  arcData,
  cross,
  dist,
  dot,
  leftNormal,
  norm,
  pathLength,
  sub,
  type Path,
  type Vec2,
} from '../geometry/index.ts';
import type { Id } from '../ids/index.ts';
import type { Model } from '../model/types.ts';
import { lengthAt, stationAt } from '../opening/along.ts';
import { pointInPolygon } from '../selection/pick.ts';
import { wallGeometry } from '../wall/geometry.ts';
import { wallSection } from '../wall/queries.ts';
import type { Wall } from '../wall/types.ts';
import { verticalPlane, v3, type SurfaceFrame } from './frame.ts';
import type { FaceSide } from './types.ts';

export interface FaceRun {
  readonly wallId: Id;
  readonly side: FaceSide;
  /** Body hranice místnosti po líci (ve směru obrysu, místnost vlevo). */
  readonly points: readonly Vec2[];
  /** Délka úseku po líci (mm) = rozsah u. */
  readonly length: number;
  /** Rámec s v = 0 v úrovni ±0,000 (výšku podlahy přičte volající). */
  readonly frame: SurfaceFrame;
  /** u půdorysného bodu na líci. */
  uOf(p: Vec2): number;
  /** Půdorysný bod líce v délce u a směr růstu u v něm. */
  at(u: number): { point: Vec2; dir: Vec2 };
}

const isArc = (p: Path) => p.kind === 'arc' && Math.abs(p.bulge) > 1e-9;

interface Hit {
  readonly wallId: Id;
  readonly side: FaceSide;
  /** Jak daleko je hrana od líce (menší = lepší shoda). */
  readonly score: number;
}

/** Stěna a strana, na kterou míří hrana a→b (místnost vlevo). */
function classify(model: Model, walls: readonly Wall[], a: Vec2, b: Vec2): Hit | null {
  const d = norm(sub(b, a));
  const n = leftNormal(d);
  const probe = { x: (a.x + b.x) / 2 - n.x, y: (a.y + b.y) / 2 - n.y };
  let best: Hit | null = null;
  for (const w of walls) {
    if (!wallGeometry(model, w, Number.NEGATIVE_INFINITY).outlines.some((o) => pointInPolygon(probe, o)))
      continue;
    const s = lengthAt(w.path, probe);
    const st = stationAt(w.path, s);
    const o = dot(sub(probe, st.point), st.normal) + dot(n, st.normal);
    const parallel = Math.abs(cross(d, st.tangent)) < 0.5;
    const f = wallSection(model, w).faces;
    const hit: Hit = parallel
      ? Math.abs(o - f.ref) <= Math.abs(o - f.opp)
        ? { wallId: w.id, side: 'ref', score: Math.abs(o - f.ref) }
        : { wallId: w.id, side: 'opp', score: Math.abs(o - f.opp) }
      : { wallId: w.id, side: s < pathLength(w.path) / 2 ? 'start' : 'end', score: 1e6 };
    if (!best || hit.score < best.score) best = hit;
  }
  return best;
}

function straightRun(wallId: Id, side: FaceSide, points: readonly Vec2[]): FaceRun {
  const first = points[0] as Vec2;
  const last = points[points.length - 1] as Vec2;
  const dir = norm(sub(first, last));
  const length = dist(first, last);
  const uOf = (p: Vec2) => dot(sub(p, last), dir);
  return {
    wallId,
    side,
    points,
    length,
    frame: verticalPlane(last, dir, 0),
    uOf,
    at: (u) => ({ point: { x: last.x + dir.x * u, y: last.y + dir.y * u }, dir }),
  };
}

function arcRun(wall: Wall, side: FaceSide, points: readonly Vec2[]): FaceRun {
  const c = arcData(wall.path as Extract<Path, { kind: 'arc' }>).center;
  const last = points[points.length - 1] as Vec2;
  const radius = dist(last, c);
  const angle0 = angleOf(sub(last, c));
  const prev = points[points.length - 2] as Vec2;
  const dir: 1 | -1 = cross(sub(last, c), sub(prev, c)) >= 0 ? 1 : -1;
  const delta = (p: Vec2) => {
    const r = (((dir * (angleOf(sub(p, c)) - angle0)) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    return r > 2 * Math.PI - 1e-3 ? r - 2 * Math.PI : r;
  };
  let sweep = 0;
  for (let i = points.length - 1; i > 0; i--) {
    const a = angleOf(sub(points[i] as Vec2, c));
    const b = angleOf(sub(points[i - 1] as Vec2, c));
    sweep += (((dir * (b - a)) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  }
  const at = (u: number) => {
    const a = angle0 + (dir * u) / radius;
    return {
      point: { x: c.x + radius * Math.cos(a), y: c.y + radius * Math.sin(a) },
      dir: { x: -dir * Math.sin(a), y: dir * Math.cos(a) },
    };
  };
  return {
    wallId: wall.id,
    side,
    points,
    length: sweep * radius,
    frame: {
      kind: 'cylinder',
      center: v3(c.x, c.y, 0),
      radius,
      angle0,
      dir,
      facing: dir > 0 ? 'outward' : 'inward',
    },
    uOf: (p) => delta(p) * radius,
    at,
  };
}

/** Rozdělí smyčku (místnost vlevo) na úseky líců stěn. */
export function loopRuns(model: Model, walls: readonly Wall[], loop: readonly Vec2[]): FaceRun[] {
  const n = loop.length;
  const hits = loop.map((a, i) => classify(model, walls, a, loop[(i + 1) % n] as Vec2));
  const key = (i: number) => {
    const h = hits[(i + n) % n];
    return h ? `${h.wallId}:${h.side}` : '';
  };
  // Začít na hraně, kde začíná nový úsek (jinak by se první úsek rozdělil na dva).
  let start = 0;
  while (start < n && key(start) === key(start - 1)) start++;
  if (start === n) start = 0;
  const runs: { hit: Hit; points: Vec2[] }[] = [];
  for (let k = 0; k < n; k++) {
    const i = (start + k) % n;
    const hit = hits[i];
    const a = loop[i] as Vec2;
    const b = loop[(i + 1) % n] as Vec2;
    const cur = runs[runs.length - 1];
    if (hit && cur && k > 0 && key(i) === key(i - 1)) cur.points.push(b);
    else if (hit) runs.push({ hit, points: [a, b] });
  }
  const byId = new Map(walls.map((w) => [w.id, w]));
  return runs.map(({ hit, points }) => {
    const w = byId.get(hit.wallId) as Wall;
    const curved = isArc(w.path) && (hit.side === 'ref' || hit.side === 'opp') && points.length > 2;
    return curved ? arcRun(w, hit.side, points) : straightRun(hit.wallId, hit.side, points);
  });
}
