// T napojení (konec stěny na hostiteli uprostřed) a kříž X (dvě průběžné stěny) podle priority materiálů.
// T: vrstva napojené stěny projde vrstvami hostitele s nižší prioritou, zastaví se na první se stejnou
// nebo vyšší prioritou a na jádru hostitele vždy (jádro hostitele se nikdy neprořízne, skupina A).
// X: v buňce dvou vrstev vyhraje vyšší priorita, při shodě hostitel (relating).
import { mul } from '../geometry/index.ts';
import { armKey, boundary, reachOf, type Arm, type Frame, type FrameLayer } from './frame.ts';
import type { HalfPlane } from './half-plane.ts';
import { crossOrder, stopAt } from './travel.ts';
import type { EndResult, Gap, NodeResult } from './types.ts';

/** Mezera „pás vrstvy `x` rámu `f`“: zůstane, co leží pod jeho spodní nebo nad horní hranicí. */
export const stripGap = (layer: number, f: Frame, x: FrameLayer): Gap => ({
  layer,
  keep: [[boundary(f, x.lo, mul(f.normal, -1))], [boundary(f, x.hi, f.normal)]],
});

/** Konec napojené stěny a mezery hostitele. */
export function teeTravel(j: Arm, host: Frame): { end: EndResult; gaps: Gap[] } {
  const reach = reachOf([j, host]);
  const o = crossOrder(j, host);
  const gaps: Gap[] = [];
  const layers = j.layers.map((x) => {
    let cut: HalfPlane = stopAt(j, host, o.far);
    for (const c of o.order) {
      if (c.layer.core || c.layer.prio >= x.prio) {
        cut = stopAt(j, host, c.near);
        break;
      }
      gaps.push(stripGap(c.layer.index, j, x));
    }
    return { variants: [[cut]], extend: reach, extras: [] };
  });
  return { end: { join: 'tee', layers }, gaps };
}

export function solveTee(j: Arm, host: Frame): NodeResult {
  const t = teeTravel(j, host);
  return { ends: new Map([[armKey(j.wall.id, j.end), t.end]]), gaps: new Map([[host.wall.id, t.gaps]]) };
}

/** Kříž: `a` je hostitel (relating) a vyhrává při stejné prioritě. */
export function solveCross(a: Frame, b: Frame): NodeResult {
  const ga: Gap[] = [];
  const gb: Gap[] = [];
  for (const x of a.layers)
    for (const y of b.layers) {
      if (x.prio >= y.prio) gb.push(stripGap(y.index, a, x));
      else ga.push(stripGap(x.index, b, y));
    }
  return {
    ends: new Map(),
    gaps: new Map([
      [a.wall.id, ga],
      [b.wall.id, gb],
    ]),
  };
}
