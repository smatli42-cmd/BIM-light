// Volný konec stěny (rozhodnutí C plánu stěn): povrchové vrstvy obou stran zahnou přes čelo a uzavřou
// ho, každá strana do poloviny „těla“ (jádro + izolace); vnější omítka jde nejvíc ven. Tělo se zkrátí
// o tloušťku omítek své strany. Povrch jen na jedné straně zahne přes celé čelo.
// Typ bez povrchových vrstev, nebo jen z nich: kolmé čelo.
import { add, mul, type Vec2 } from '../geometry/index.ts';
import type { Arm, FrameLayer } from './frame.ts';
import { halfPlane, type HalfPlane } from './half-plane.ts';
import { sameCut, type EndResult, type LayerEnd } from './types.ts';

interface Side {
  /** Povrchové vrstvy od líce dovnitř. */
  readonly finishes: readonly FrameLayer[];
  /** Na které straně offsetů leží (−1 = nízké offsety, +1 = vysoké). */
  readonly dir: -1 | 1;
}

/** Povrchové vrstvy na nízké a vysoké straně offsetů; tělo = vše mezi nimi. */
function sides(arm: Arm): { low: Side; high: Side; body: FrameLayer[] } | null {
  const sorted = [...arm.layers].sort((a, b) => a.lo - b.lo);
  const lowCount = sorted.findIndex((l) => !l.finish);
  if (lowCount < 0) return null;
  const highCount = [...sorted].reverse().findIndex((l) => !l.finish);
  if (lowCount === 0 && highCount === 0) return null;
  return {
    low: { finishes: sorted.slice(0, lowCount), dir: -1 },
    high: { finishes: sorted.slice(sorted.length - highCount).reverse(), dir: 1 },
    body: sorted.slice(lowCount, sorted.length - highCount),
  };
}

const total = (ls: readonly FrameLayer[]) => ls.reduce((s, l) => s + l.hi - l.lo, 0);

export function freeEnd(arm: Arm): EndResult {
  const t = mul(arm.out, -1);
  const at = (u: number, v: number): Vec2 => add(add(arm.origin, mul(t, u)), mul(arm.normal, v));
  /** Vrstva končí `d` mm před koncem referenční čáry. */
  const back = (d: number): HalfPlane => halfPlane(at(-d, 0), arm.normal, arm.out);
  const s = sides(arm);
  if (!s) return { join: 'free', layers: sameCut([back(0)], 0, arm.layers.length) };
  const bodyLo = Math.min(...s.body.map((l) => l.lo));
  const bodyHi = Math.max(...s.body.map((l) => l.hi));
  // Má-li povrch jen jedna strana, zahne přes celé čelo; jinak každá strana do poloviny těla.
  const mid = !s.low.finishes.length ? bodyLo : !s.high.finishes.length ? bodyHi : (bodyLo + bodyHi) / 2;
  const ends = new Map<number, LayerEnd>();
  for (const side of [s.low, s.high]) {
    let depth = 0;
    for (const l of side.finishes) {
      const a = l.hi - l.lo;
      const inner = side.dir < 0 ? l.hi : l.lo;
      const wrap = [at(-depth, inner), at(-depth - a, inner), at(-depth - a, mid), at(-depth, mid)];
      ends.set(l.index, { variants: [[back(depth)]], extend: 0, extras: [wrap] });
      depth += a;
    }
  }
  const [dl, dh] = [total(s.low.finishes), total(s.high.finishes)];
  const lowHalf = halfPlane(at(0, mid), arm.tangent, mul(arm.normal, -1));
  const highHalf = halfPlane(at(0, mid), arm.tangent, arm.normal);
  for (const l of s.body) {
    const variants =
      Math.abs(dl - dh) < 1e-9
        ? [[back(dl)]]
        : [
            [back(dl), lowHalf],
            [back(dh), highHalf],
          ];
    ends.set(l.index, { variants, extend: 0, extras: [] });
  }
  return {
    join: 'free',
    layers: arm.layers.map((l) => ends.get(l.index) ?? { variants: [[]], extend: 0, extras: [] }),
  };
}
