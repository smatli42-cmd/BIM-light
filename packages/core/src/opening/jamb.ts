// Výřez otvoru ve vrstvách stěny (plán stěn Z4, rozhodnutí C): průchozí otvor přeruší všechny vrstvy;
// šířka otvoru je stavební otvor v jádru. Povrchové vrstvy obou stran zahnou do ostění, každá strana do
// poloviny těla (jádro + izolace) jako u volného konce (Z2); vrstva u jádra jde nejblíž k jádru.
// Nika vyřízne jen to, co leží do hloubky od zvoleného líce; bez obalení.
import type { Vec2 } from '../geometry/index.ts';
import { frameLayers, type FrameLayer } from '../junction/frame.ts';
import { halfPlane, type HalfPlane } from '../junction/half-plane.ts';
import type { Gap } from '../junction/types.ts';
import type { Model } from '../model/types.ts';
import { wallSection } from '../wall/queries.ts';
import type { Wall } from '../wall/types.ts';
import { pointAtStation, stationAt } from './along.ts';
import { openingSpan } from './geometry.ts';
import type { Opening } from './types.ts';

/** Polorovina „před“ (dir = −1) nebo „za“ (dir = +1) příčnou čárou ve vzdálenosti `s`. */
function across(wall: Wall, s: number, dir: -1 | 1): HalfPlane {
  const st = stationAt(wall.path, s);
  return halfPlane(st.point, st.normal, { x: st.tangent.x * dir, y: st.tangent.y * dir });
}

/** Obdélník (u oblouku čtyřúhelník) mezi vzdálenostmi `a`, `b` a offsety `lo`, `hi`. */
function quad(wall: Wall, a: number, b: number, lo: number, hi: number): Vec2[] {
  const at = (s: number, o: number) => pointAtStation(wall.path, s, o);
  return [at(a, lo), at(b, lo), at(b, hi), at(a, hi)];
}

interface Wrap {
  /** O kolik vrstva zasahuje do otvoru od hrany stavebního otvoru (mm). */
  readonly reach: number;
  /** Zahnutý kousek: od `from` do `reach`, příčně od vnitřní hranice vrstvy k polovině těla. */
  readonly from: number;
  readonly lo: number;
  readonly hi: number;
}

/** Zahnutí povrchových vrstev do ostění (klíč = index vrstvy). */
function wraps(layers: readonly FrameLayer[], half: number): Map<number, Wrap> {
  const out = new Map<number, Wrap>();
  const sorted = [...layers].sort((a, b) => a.lo - b.lo);
  const lowCount = sorted.findIndex((l) => !l.finish);
  if (lowCount < 0) return out;
  const highCount = [...sorted].reverse().findIndex((l) => !l.finish);
  const low = sorted.slice(0, lowCount);
  const high = sorted.slice(sorted.length - highCount);
  const body = sorted.slice(lowCount, sorted.length - highCount);
  const bodyLo = Math.min(...body.map((l) => l.lo));
  const bodyHi = Math.max(...body.map((l) => l.hi));
  const mid = !low.length ? bodyLo : !high.length ? bodyHi : (bodyLo + bodyHi) / 2;
  // Od jádra ven: vrstva u jádra zahne nejblíž hraně otvoru.
  const sides: [FrameLayer[], -1 | 1][] = [
    [[...low].reverse(), -1],
    [high, 1],
  ];
  for (const [finishes, dir] of sides) {
    let depth = 0;
    for (const l of finishes) {
      const a = l.hi - l.lo;
      const from = Math.min(depth, half);
      const reach = Math.min(depth + a, half);
      const inner = dir < 0 ? l.hi : l.lo;
      out.set(l.index, { reach, from, lo: Math.min(inner, mid), hi: Math.max(inner, mid) });
      depth += a;
    }
  }
  return out;
}

function throughGaps(model: Model, wall: Wall, o: Opening): Gap[] {
  const { s0, s1 } = openingSpan(o);
  const layers = frameLayers(model, wall);
  const w = wraps(layers, (s1 - s0) / 2);
  return layers.map((l) => {
    const wr = w.get(l.index);
    const r = wr?.reach ?? 0;
    const keep = [[across(wall, s0 + r, -1)], [across(wall, s1 - r, 1)]];
    if (!wr || wr.reach - wr.from < 1e-6) return { layer: l.index, keep };
    const extras = [
      quad(wall, s0 + wr.from, s0 + wr.reach, wr.lo, wr.hi),
      quad(wall, s1 - wr.reach, s1 - wr.from, wr.lo, wr.hi),
    ];
    return { layer: l.index, keep, extras };
  });
}

function nicheGaps(model: Model, wall: Wall, o: Opening): Gap[] {
  const { s0, s1 } = openingSpan(o);
  const faces = wallSection(model, wall).faces;
  const face = o.side === 'ref' ? faces.ref : faces.opp;
  const into = Math.sign((o.side === 'ref' ? faces.opp : faces.ref) - face);
  const st = stationAt(wall.path, (s0 + s1) / 2);
  const depthLine = pointAtStation(wall.path, (s0 + s1) / 2, face + into * o.depth);
  const beyond = halfPlane(depthLine, st.tangent, { x: st.normal.x * into, y: st.normal.y * into });
  return frameLayers(model, wall).map((l) => ({
    layer: l.index,
    keep: [
      [across(wall, s0, -1)],
      [across(wall, s1, 1)],
      [across(wall, s0, 1), across(wall, s1, -1), beyond],
    ],
  }));
}

/** Mezery ve vrstvách stěny od otvorů, které ji v rovině řezu přeruší. */
export function openingGaps(model: Model, wall: Wall, openings: readonly Opening[]): Gap[] {
  return openings.flatMap((o) =>
    o.kind === 'niche' ? nicheGaps(model, wall, o) : throughGaps(model, wall, o),
  );
}
