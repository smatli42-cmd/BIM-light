// Líc nebo osa stěny oříznutá podle konce vrstvy po napojení (pro kóty, přichytávání a výběr).
import {
  add,
  carrierOf,
  dot,
  endPoint,
  intersectNearest,
  mul,
  sub,
  tangentAt,
  withEnd,
  type Path,
  type PathEnd,
} from '../geometry/index.ts';
import { lineDir, side, type HalfPlane } from './half-plane.ts';
import type { LayerEnd } from './types.ts';

/** Interval parametru t úsečky s + t·(e − s), který leží ve všech polorovinách; null = prázdný. */
function lineInterval(s: Path['start'], e: Path['end'], hs: readonly HalfPlane[], t0: number, t1: number) {
  let [a, b] = [t0, t1];
  const d = sub(e, s);
  for (const h of hs) {
    const k = dot(d, h.n);
    const c = side(h, s);
    if (Math.abs(k) < 1e-12) {
      if (c < -1e-9) return null;
      continue;
    }
    const t = -c / k;
    if (k > 0) a = Math.max(a, t);
    else b = Math.min(b, t);
  }
  return a <= b ? ([a, b] as const) : null;
}

/** Přímá křivka: průnik s variantami obou konců (nejširší výsledek). */
function trimLine(p: Extract<Path, { kind: 'line' }>, s: LayerEnd, e: LayerEnd): Path {
  const len = Math.hypot(p.end.x - p.start.x, p.end.y - p.start.y) || 1;
  const [t0, t1] = [-s.extend / len, 1 + e.extend / len];
  let best: readonly [number, number] | null = null;
  for (const vs of s.variants)
    for (const ve of e.variants) {
      const r = lineInterval(p.start, p.end, [...vs, ...ve], t0, t1);
      if (r && (!best || r[1] - r[0] > best[1] - best[0])) best = r;
    }
  if (!best) return p;
  const at = (t: number) => add(p.start, mul(sub(p.end, p.start), t));
  return { kind: 'line', start: at(best[0]), end: at(best[1]) };
}

/** Oblouk (připraveno pro Z5): konec se posune na průsečík s nejvíc omezující přímkou řezu. */
function trimArc(p: Path, ends: Record<PathEnd, LayerEnd>): Path {
  let out = p;
  for (const end of ['start', 'end'] as const) {
    const at = endPoint(p, end);
    const lines = (ends[end].variants[0] ?? []).filter((h) => Math.abs(dot(tangentAt(p, end), h.n)) > 1e-9);
    for (const h of lines) {
      const hit = intersectNearest(carrierOf(out), { kind: 'line', p: h.p, d: lineDir(h) }, at, 1e5);
      if (hit) out = withEnd(out, end, hit);
    }
  }
  return out;
}

export function trimPath(p: Path, ends: Record<PathEnd, LayerEnd>): Path {
  return p.kind === 'line' || Math.abs(p.bulge) < 1e-9
    ? trimLine({ kind: 'line', start: p.start, end: p.end }, ends.start, ends.end)
    : trimArc(p, ends);
}
