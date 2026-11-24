// Poloha kótovací čáry a zarovnání kót (pravidla-interakce, kóty 3–4, 7).
// Poloha čáry = souřadnice c podél kanonické normály čáry; rovnoběžné kóty se stejným c leží v řadě.
import {
  cross,
  dot,
  leftNormal,
  mul,
  norm,
  offsetPath,
  pointAt,
  sub,
  tangentAt,
  type Vec2,
} from '../geometry/index.ts';
import type { Id } from '../ids/index.ts';
import type { Model } from '../model/types.ts';
import { facePath } from './measure.ts';
import type { Dimension } from './types.ts';

export interface DimensionLine {
  /** Směr kótovací čáry (jednotkový). */
  readonly dir: Vec2;
  /** Kanonická normála čáry (x > 0, nebo x = 0 a y > 0). */
  readonly normal: Vec2;
  /** Poloha čáry podél normály (mm). */
  readonly c: number;
  readonly start: Vec2;
  readonly end: Vec2;
}

function canonicalNormal(dir: Vec2): Vec2 {
  const n = leftNormal(dir);
  return n.x < -1e-9 || (Math.abs(n.x) <= 1e-9 && n.y < 0) ? mul(n, -1) : n;
}

function lineFrom(start: Vec2, end: Vec2): DimensionLine | null {
  const v = sub(end, start);
  if (Math.hypot(v.x, v.y) < 1e-6) return null;
  const dir = norm(v);
  const normal = canonicalNormal(dir);
  return { dir, normal, c: dot(start, normal), start, end };
}

/** Kótovací čára délkové nebo vzdálenostní kóty (úhlová nemá přímou čáru → null). */
export function dimensionLine(model: Model, d: Dimension): DimensionLine | null {
  if (d.kind === 'angular') return null;
  if (d.kind === 'length') {
    const face = facePath(model, d.ref);
    if (face.kind !== 'line') return null;
    const l = offsetPath(face, d.offset);
    return lineFrom(l.start, l.end);
  }
  const fa = facePath(model, d.refs[0]);
  const fb = facePath(model, d.refs[1]);
  const t = tangentAt(fa, 'start');
  const base = { x: pointAt(fa, 0.5).x + t.x * d.offset, y: pointAt(fa, 0.5).y + t.y * d.offset };
  const db = tangentAt(fb, 'start');
  const pB = {
    x: fb.start.x + db.x * dot(sub(base, fb.start), db),
    y: fb.start.y + db.y * dot(sub(base, fb.start), db),
  };
  return lineFrom(base, pB);
}

/** Kóta s odsazením takovým, aby čára procházela bodem `p` (nese se na myši). */
export function withLineThrough(model: Model, d: Dimension, p: Vec2): Dimension {
  if (d.kind === 'angular') return d;
  const line = dimensionLine(model, d);
  if (!line) return d;
  const c = dot(p, line.normal);
  if (d.kind === 'length') {
    const face = facePath(model, d.ref);
    const ln = leftNormal(tangentAt(face, 'start'));
    const k = dot(ln, line.normal);
    return Math.abs(k) < 1e-9 ? d : { ...d, offset: (c - dot(face.start, line.normal)) / k };
  }
  const fa = facePath(model, d.refs[0]);
  const k = dot(tangentAt(fa, 'start'), line.normal);
  return Math.abs(k) < 1e-9 ? d : { ...d, offset: (c - dot(pointAt(fa, 0.5), line.normal)) / k };
}

export interface LineSnap {
  /** Bod, kterým má čára procházet (po přichycení). */
  readonly point: Vec2;
  /** Kóta, ke které se čára zarovnala. */
  readonly alignWith: Id | null;
  /** Světle modré vodítko přes obě kóty. */
  readonly guide: readonly [Vec2, Vec2] | null;
}

const span = (l: DimensionLine, dir: Vec2) => {
  const a = dot(l.start, dir);
  const b = dot(l.end, dir);
  return [Math.min(a, b), Math.max(a, b)] as const;
};

/** Přichycení čáry k rovnoběžné kótě poblíž (kóty 3); `exclude` = kóty, které se právě hýbou. */
export function snapDimensionLine(
  model: Model,
  moving: Dimension,
  p: Vec2,
  candidates: readonly Dimension[],
  tol: number,
  exclude: ReadonlySet<Id>,
): LineSnap {
  const own = dimensionLine(model, withLineThrough(model, moving, p));
  if (!own) return { point: p, alignWith: null, guide: null };
  const [lo, hi] = span(own, own.dir);
  let best: { d: number; line: DimensionLine; id: Id } | null = null;
  for (const e of candidates) {
    if (exclude.has(e.id)) continue;
    const l = dimensionLine(model, e);
    if (!l || Math.abs(cross(l.dir, own.dir)) > 0.02) continue;
    const [elo, ehi] = span(l, own.dir);
    if (Math.max(lo, elo) - Math.min(hi, ehi) > 5000) continue;
    const dd = Math.abs(dot(l.start, own.normal) - own.c);
    if (dd <= tol && (!best || dd < best.d)) best = { d: dd, line: l, id: e.id };
  }
  if (!best) return { point: p, alignWith: null, guide: null };
  const c = dot(best.line.start, own.normal);
  const point = {
    x: p.x + own.normal.x * (c - dot(p, own.normal)),
    y: p.y + own.normal.y * (c - dot(p, own.normal)),
  };
  const [blo, bhi] = span(best.line, own.dir);
  const at = (t: number) => ({ x: own.normal.x * c + own.dir.x * t, y: own.normal.y * c + own.dir.y * t });
  return { point, alignWith: best.id, guide: [at(Math.min(lo, blo)), at(Math.max(hi, bhi))] };
}
