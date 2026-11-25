// Průsečík dvou hranic vrstev (přímka / kružnice) poblíž uzlu (Z5). Kružnice se bere jako tětivy
// společné mřížky (geometry/arc-grid), aby bod pokosu ležel přesně na hraně, kterou kreslí sousední vrstva.
import {
  cross,
  dist,
  gridCount,
  gridParam,
  gridPoint,
  intersect,
  sub,
  type Carrier,
  type Vec2,
} from '../geometry/index.ts';
import type { Curve } from './frame.ts';
import { lineX } from './half-plane.ts';

type Seg = { readonly p: Vec2; readonly d: Vec2 };

const carrier = (c: Curve): Carrier =>
  c.kind === 'line' ? { kind: 'line', p: c.p, d: c.d } : { kind: 'circle', c: c.c, r: c.r };

/** Přímky, které v okolí bodu `q` tvoří křivku (u kružnice tři tětivy kolem `q`). */
function pieces(c: Curve, q: Vec2): Seg[] {
  if (c.kind === 'line') return [{ p: c.p, d: c.d }];
  const n = gridCount(c.r);
  const k = Math.floor(gridParam(c.c, n, q));
  return [k - 1, k, k + 1].map((i) => {
    const a = gridPoint(c.c, c.r, n, i);
    return { p: a, d: sub(gridPoint(c.c, c.r, n, i + 1), a) };
  });
}

/** Leží bod na tětivě (u kružnice), nebo kdekoli na přímce? */
const within = (s: Seg, c: Curve, x: Vec2): boolean => {
  if (c.kind === 'line') return true;
  const t = cross(sub(x, s.p), { x: -s.d.y, y: s.d.x }) / (s.d.x * s.d.x + s.d.y * s.d.y);
  return t >= -1e-9 && t <= 1 + 1e-9;
};

/** Průsečík hranic `a` a `b` nejblíž k bodu `near`, nebo null. */
export function meet(a: Curve, b: Curve, near: Vec2): Vec2 | null {
  if (a.kind === 'line' && b.kind === 'line') return lineX(a.p, a.d, b.p, b.d);
  let best: Vec2 | null = null;
  for (const q of intersect(carrier(a), carrier(b))) if (!best || dist(q, near) < dist(best, near)) best = q;
  if (!best) return null;
  const rough = best;
  let found: Vec2 | null = null;
  for (const sa of pieces(a, rough))
    for (const sb of pieces(b, rough)) {
      const x = lineX(sa.p, sa.d, sb.p, sb.d);
      if (x && within(sa, a, x) && within(sb, b, x) && (!found || dist(x, rough) < dist(found, rough)))
        found = x;
    }
  return found ?? rough;
}
