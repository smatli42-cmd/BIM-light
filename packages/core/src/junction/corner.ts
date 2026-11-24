// Roh L (konec–konec, ne v přímce) po vrstvách podle priority materiálů (návrh Z2 ve STAV.md).
// Vrstvy se řeší od nejvyšší priority: vrstva jede přes uzel napříč vrstvami druhé stěny a zastaví se
// na první, která tam skutečně je a má vyšší prioritu. Stejná priorita = pokos úhlopříčkou buňky.
import { dist, sub } from '../geometry/index.ts';
import { armKey, lineAt, outSides, reachOf, type Arm, type FrameLayer } from './frame.ts';
import { halfPlane, lineX, type HalfPlane } from './half-plane.ts';
import { cell, crossOrder, occupies, stopAt, type CrossOrder } from './travel.ts';
import type { EndResult, NodeResult } from './types.ts';

interface Entry {
  readonly side: 0 | 1;
  readonly arm: Arm;
  readonly other: Arm;
  readonly layer: FrameLayer;
}

interface Ctx {
  readonly orders: readonly [CrossOrder, CrossOrder];
  readonly cuts: Map<string, HalfPlane[]>;
  readonly reach: number;
}

const key = (side: number, index: number) => `${side}:${index}`;
const indexIn = (o: CrossOrder, layerIndex: number) => o.order.findIndex((c) => c.layer.index === layerIndex);

/** Kam vrstva dojede, když nepočítáme vrstvy stejné priority (index v pořadí a polorovina). */
function hardReach(e: Entry, ctx: Ctx): { idx: number; cut: HalfPlane } {
  const o = ctx.orders[e.side];
  for (const [i, c] of o.order.entries()) {
    if (c.layer.prio <= e.layer.prio) continue;
    const cy = ctx.cuts.get(key(1 - e.side, c.layer.index));
    if (cy && occupies(cell(e.arm, e.layer, e.other, c.layer, ctx.reach), cy))
      return { idx: i, cut: stopAt(e.arm, e.other, c.near) };
  }
  return { idx: o.order.length, cut: stopAt(e.arm, e.other, o.far) };
}

/** Pokos dvou vrstev: úhlopříčka jejich buňky (rohy levá–pravá a pravá–levá). */
export function miter(a: Arm, x: FrameLayer, b: Arm, y: FrameLayer): [HalfPlane, HalfPlane] | null {
  const sx = outSides(a, x);
  const sy = outSides(b, y);
  const [la, ra, lb, rb] = [lineAt(a, sx.left), lineAt(a, sx.right), lineAt(b, sy.left), lineAt(b, sy.right)];
  const q1 = lineX(la.p, la.d, rb.p, rb.d);
  const q2 = lineX(ra.p, ra.d, lb.p, lb.d);
  if (!q1 || !q2 || dist(q1, q2) < 1e-6) return null;
  const d = sub(q2, q1);
  return [halfPlane(q1, d, a.out), halfPlane(q1, d, b.out)];
}

/** Dvojice vrstev stejné priority, které na sebe dojedou; nejbližší se spárují jako první. */
function pairs(level: readonly Entry[], ctx: Ctx, reach: Map<Entry, { idx: number }>) {
  const out: { x: Entry; y: Entry; score: number }[] = [];
  for (const x of level.filter((e) => e.side === 0))
    for (const y of level.filter((e) => e.side === 1)) {
      const ix = indexIn(ctx.orders[0], y.layer.index);
      const iy = indexIn(ctx.orders[1], x.layer.index);
      if (ix < (reach.get(x)?.idx ?? 0) && iy < (reach.get(y)?.idx ?? 0)) out.push({ x, y, score: ix + iy });
    }
  return out.sort(
    (p, q) => p.score - q.score || p.x.layer.index - q.x.layer.index || p.y.layer.index - q.y.layer.index,
  );
}

function resolveLevel(level: readonly Entry[], ctx: Ctx) {
  const reach = new Map(level.map((e) => [e, hardReach(e, ctx)] as const));
  const done = new Set<Entry>();
  for (const { x, y } of pairs(level, ctx, reach)) {
    if (done.has(x) || done.has(y)) continue;
    const m = miter(x.arm, x.layer, y.arm, y.layer);
    if (!m) continue;
    ctx.cuts.set(key(0, x.layer.index), [m[0]]);
    ctx.cuts.set(key(1, y.layer.index), [m[1]]);
    done.add(x).add(y);
  }
  const rest = level.filter((e) => !done.has(e));
  const found = rest.map((e) => {
    const r = reach.get(e) ?? hardReach(e, ctx);
    for (const c of ctx.orders[e.side].order.slice(0, r.idx)) {
      if (c.layer.prio !== e.layer.prio) continue;
      const cy = ctx.cuts.get(key(1 - e.side, c.layer.index));
      if (cy && occupies(cell(e.arm, e.layer, e.other, c.layer, ctx.reach), cy))
        return stopAt(e.arm, e.other, c.near);
    }
    return r.cut;
  });
  rest.forEach((e, i) => ctx.cuts.set(key(e.side, e.layer.index), [found[i] as HalfPlane]));
}

export function solveCorner(a: Arm, b: Arm): NodeResult {
  const reach = reachOf([a, b]);
  const ctx: Ctx = { orders: [crossOrder(a, b), crossOrder(b, a)], cuts: new Map(), reach };
  const entries: Entry[] = [
    ...a.layers.map((layer) => ({ side: 0 as const, arm: a, other: b, layer })),
    ...b.layers.map((layer) => ({ side: 1 as const, arm: b, other: a, layer })),
  ];
  const levels = [...new Set(entries.map((e) => e.layer.prio))].sort((p, q) => q - p);
  for (const p of levels)
    resolveLevel(
      entries.filter((e) => e.layer.prio === p),
      ctx,
    );
  const endOf = (side: 0 | 1, arm: Arm): EndResult => ({
    join: 'corner',
    layers: arm.layers.map((l) => ({
      variants: [ctx.cuts.get(key(side, l.index)) ?? []],
      extend: reach,
      extras: [],
    })),
  });
  return {
    ends: new Map([
      [armKey(a.wall.id, a.end), endOf(0, a)],
      [armKey(b.wall.id, b.end), endOf(1, b)],
    ]),
    gaps: new Map(),
  };
}
