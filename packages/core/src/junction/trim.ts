// Líc nebo osa stěny oříznutá podle konce vrstvy po napojení (pro kóty, přichytávání a výběr).
// Úsečka i oblouk (Z5): zlomové body = průsečíky nosné křivky s hranicemi řezů (přímka / kružnice),
// ze zbylých úseků se vezme nejdelší, který leží ve všech řezech.
import {
  arcData,
  carrierOf,
  intersect,
  paramOf,
  pathLength,
  pointAt,
  type Carrier,
  type Path,
  type PathEnd,
} from '../geometry/index.ts';
import { isCircle, lineDir, side, type Cut } from './half-plane.ts';
import type { LayerEnd } from './types.ts';

const isArc = (p: Path): p is Extract<Path, { kind: 'arc' }> => p.kind === 'arc' && Math.abs(p.bulge) > 1e-9;

const border = (h: Cut): Carrier =>
  isCircle(h) ? { kind: 'circle', c: h.c, r: h.r } : { kind: 'line', p: h.p, d: lineDir(h) };

/** Bod křivky v parametru t (i mimo 0..1: prodloužení po přímce / kružnici). */
const at = (p: Path, t: number) => pointAt(p, t);

/** Parametry průsečíků křivky s hranicí řezu (u oblouku i o celou otočku zpět). */
function breaks(p: Path, h: Cut): number[] {
  const full = isArc(p) ? (2 * Math.PI) / Math.abs(arcData(p).sweep) : 0;
  return intersect(carrierOf(p), border(h)).flatMap((q) => {
    const t = paramOf(p, q);
    return full ? [t, t - full] : [t];
  });
}

/**
 * Nejdelší interval parametru v [t0, t1], který leží ve všech řezech; null = žádný. U oblouku platí
 * řezy začátku jen pro první polovinu a řezy konce pro druhou (jako pás vrstvy v junction/wall).
 */
function keptInterval(p: Path, vs: readonly Cut[], ve: readonly Cut[], t0: number, t1: number) {
  const arc = isArc(p);
  const cuts = [...vs, ...ve];
  const ts = [t0, ...cuts.flatMap((h) => breaks(p, h)), ...(arc ? [0.5] : []), t1]
    .filter((t) => t >= t0 && t <= t1)
    .sort((a, b) => a - b);
  let best: [number, number] | null = null;
  let cur: [number, number] | null = null;
  for (let i = 0; i + 1 < ts.length; i++) {
    const [a, b] = [ts[i] as number, ts[i + 1] as number];
    if (b - a < 1e-12) continue;
    const m = at(p, (a + b) / 2);
    const active = !arc ? cuts : (a + b) / 2 < 0.5 ? vs : ve;
    const ok = active.every((h) => side(h, m) >= -1e-6);
    if (ok) cur = cur ? [cur[0], b] : [a, b];
    else cur = null;
    if (cur && (!best || cur[1] - cur[0] > best[1] - best[0])) best = [cur[0], cur[1]];
  }
  return best as [number, number] | null;
}

/** Část křivky mezi parametry a, b. */
function sub(p: Path, a: number, b: number): Path {
  const start = at(p, a);
  const end = at(p, b);
  if (!isArc(p)) return { kind: 'line', start, end };
  return { kind: 'arc', start, end, bulge: Math.tan((arcData(p).sweep * (b - a)) / 4) };
}

export function trimPath(p: Path, ends: Record<PathEnd, LayerEnd>): Path {
  const len = pathLength(p) || 1;
  const maxExt = isArc(p)
    ? Math.max(
        0,
        Math.min(Math.PI / 3, Math.PI * 0.97 - Math.abs(arcData(p).sweep) / 2) / Math.abs(arcData(p).sweep),
      )
    : Infinity;
  const t0 = -Math.min(ends.start.extend / len, maxExt);
  const t1 = 1 + Math.min(ends.end.extend / len, maxExt);
  let best: [number, number] | null = null;
  for (const vs of ends.start.variants)
    for (const ve of ends.end.variants) {
      const r = keptInterval(p, vs, ve, t0, t1);
      if (r && (!best || r[1] - r[0] > best[1] - best[0])) best = r;
    }
  return best ? sub(p, best[0], best[1]) : p;
}
