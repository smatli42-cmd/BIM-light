// Volný konec stěny (rozhodnutí C plánu stěn): povrchové vrstvy obou stran zahnou přes čelo a uzavřou
// ho, každá strana do poloviny „těla“ (jádro + izolace); vnější omítka jde nejvíc ven. Tělo se zkrátí
// o tloušťku omítek své strany. Povrch jen na jedné straně zahne přes celé čelo.
// Typ bez povrchových vrstev, nebo jen z nich: kolmé čelo.
import { add, angleOf, arcPoints, mul, pathLength, sub, type Vec2 } from '../geometry/index.ts';
import { stationAt } from '../opening/along.ts';
import { boundary, radiusAt, type Arm, type FrameLayer } from './frame.ts';
import { halfPlane, signedArea, type HalfPlane } from './half-plane.ts';
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

/** Místo `d` mm od konce po referenční čáře směrem do stěny (u oblouku po oblouku, Z5). */
function station(arm: Arm, d: number) {
  const len = pathLength(arm.wall.path);
  return stationAt(arm.wall.path, arm.end === 'start' ? d : len - d);
}

/** Kousek mezi vzdálenostmi `d0`, `d1` od konce a offsety `lo`, `hi` (u oblouku výseč mezikruží). */
function piece(arm: Arm, d0: number, d1: number, lo: number, hi: number): Vec2[] {
  const at = (d: number, o: number) => {
    const st = station(arm, d);
    return add(st.point, mul(st.normal, o));
  };
  if (!arm.arc) return [at(d0, lo), at(d1, lo), at(d1, hi), at(d0, hi)];
  const c = arm.arc.c;
  const ang = (d: number) => angleOf(sub(station(arm, d).point, c));
  let sweep = ang(d1) - ang(d0);
  if (sweep > Math.PI) sweep -= 2 * Math.PI;
  if (sweep < -Math.PI) sweep += 2 * Math.PI;
  const poly = [
    ...arcPoints(c, radiusAt(arm.arc, lo), ang(d0), sweep),
    ...arcPoints(c, radiusAt(arm.arc, hi), ang(d0) + sweep, -sweep),
  ];
  return signedArea(poly) >= 0 ? poly : poly.reverse();
}

export function freeEnd(arm: Arm): EndResult {
  /** Vrstva končí `d` mm před koncem referenční čáry. */
  const back = (d: number): HalfPlane => {
    const st = station(arm, d);
    return halfPlane(st.point, st.normal, arm.end === 'start' ? st.tangent : mul(st.tangent, -1));
  };
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
      const wrap = piece(arm, depth, depth + a, inner, mid);
      ends.set(l.index, { variants: [[back(depth)]], extend: 0, extras: [wrap] });
      depth += a;
    }
  }
  const [dl, dh] = [total(s.low.finishes), total(s.high.finishes)];
  const lowHalf = boundary(arm, mid, mul(arm.normal, -1));
  const highHalf = boundary(arm, mid, arm.normal);
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
