// Obrysové čáry stěny: líce vždy, čelo konce jen u volného konce. Pokos v rohu ani čelo v T se
// nekreslí (napojené stěny tvoří jeden souvislý řez, katalog pohledů: Stěna).
import { tessellate, type Vec2 } from '../geometry/index.ts';
import type { WallGeometry } from './geometry.ts';

export interface OutlineRun {
  readonly points: readonly Vec2[];
  readonly closed: boolean;
}

/** Úseky obrysu; volné oba konce = jeden uzavřený obrys. */
export function outlineRuns(g: WallGeometry): OutlineRun[] {
  const ref = tessellate(g.faces.ref);
  const opp = tessellate(g.faces.opp).reverse();
  const startFree = g.cuts.start.join === 'free';
  const endFree = g.cuts.end.join === 'free';
  if (startFree && endFree) return [{ points: [...ref, ...opp], closed: true }];
  if (endFree) return [{ points: [...ref, ...opp], closed: false }];
  if (startFree) return [{ points: [...opp, ...ref], closed: false }];
  return [
    { points: ref, closed: false },
    { points: opp, closed: false },
  ];
}
