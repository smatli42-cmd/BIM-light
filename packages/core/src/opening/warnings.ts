// Upozornění k otvoru (plán stěn Z4): otvor těsně u rohu změnu neodmítne, jen upozorní. Pilířek = zbytek
// stěny mezi hranou otvoru a koncem líce stěny u napojeného konce (měří se na obou lících, platí kratší).
import { endPoint } from '../geometry/index.ts';
import type { Model } from '../model/types.ts';
import { wallGeometry } from '../wall/geometry.ts';
import { getWall } from '../wall/queries.ts';
import { lengthAt } from './along.ts';
import { openingSpan } from './geometry.ts';
import { NEAR_CORNER, type Opening } from './types.ts';

/** Nejkratší pilířek u napojených konců (mm, záporný = otvor zasahuje za líc), nebo null. */
export function cornerPier(model: Model, o: Opening): number | null {
  const wall = getWall(model, o.hostId);
  const g = wallGeometry(model, wall);
  const { s0, s1 } = openingSpan(o);
  let min: number | null = null;
  for (const end of ['start', 'end'] as const) {
    if (g.cuts[end].join === 'free') continue;
    for (const side of ['ref', 'opp'] as const) {
      const s = lengthAt(wall.path, endPoint(g.faces[side], end));
      const pier = end === 'start' ? s0 - s : s - s1;
      min = Math.min(min ?? Infinity, pier);
    }
  }
  return min;
}

/** Upozornění k otvoru (prázdné = v pořádku). */
export function openingWarnings(model: Model, o: Opening): string[] {
  const pier = cornerPier(model, o);
  if (pier === null || pier >= NEAR_CORNER) return [];
  if (pier < 0.5) return ['Otvor zasahuje do napojené stěny'];
  return [`Otvor je těsně u rohu (pilířek ${Math.round(pier)} mm)`];
}
