// Hrany stěny, na které jde kótovat: líce, osa a čela konců (čelo = úsečka mezi konci líců).
// Čelo volného konce je skutečná hrana stěny; kóta k němu měří délku stěny až po volný konec.
import { endPoint, type Path, type PathEnd } from '../geometry/index.ts';
import type { WallGeometry } from './geometry.ts';
import type { WallFace } from './types.ts';

/** Líc stěny nebo čelo konce ('start' / 'end'). */
export type WallEdge = WallFace | PathEnd;

export const isCap = (e: WallEdge): e is PathEnd => e === 'start' || e === 'end';

/** Čelo konce stěny jako úsečka od referenčního k protějšímu líci. */
export function capPath(g: WallGeometry, end: PathEnd): Path {
  return { kind: 'line', start: endPoint(g.faces.ref, end), end: endPoint(g.faces.opp, end) };
}

export function edgePath(g: WallGeometry, e: WallEdge): Path {
  return isCap(e) ? capPath(g, e) : g.faces[e];
}

/** Hrana je viditelná a kótovatelná: líce vždy, čelo jen u volného (nepřipojeného) konce. */
export const edgeAvailable = (g: WallGeometry, e: WallEdge): boolean =>
  !isCap(e) || g.cuts[e].join === 'free';
