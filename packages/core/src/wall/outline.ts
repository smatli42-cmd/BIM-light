// Obrysové čáry stěny: líce vždy, čelo konce jen u volného konce. Pokos v rohu ani čelo v T se
// nekreslí a líc hostitele se v místě T napojení přeruší (napojené stěny = jeden souvislý řez).
// U rovného napojení (stěny za sebou) se kreslí jen část čela, kterou nezakrývá navazující stěna.
import { dist, pointAt, splitPath, tessellate, type Path, type Vec2 } from '../geometry/index.ts';
import { capPath } from './edges.ts';
import type { WallGeometry } from './geometry.ts';

export interface OutlineRun {
  readonly points: readonly Vec2[];
  readonly closed: boolean;
}

/** Úseky líce (parametr 0..1), kde se čára nekreslí – místa T napojení. */
export type GapList = readonly (readonly [number, number])[];
export interface FaceGaps {
  readonly ref?: GapList;
  readonly opp?: GapList;
  /** Mezery v čelech (rovné napojení: část čela, kterou zakrývá navazující stěna). */
  readonly caps?: Readonly<Partial<Record<'start' | 'end', GapList>>>;
  /** Mezery v hranicích vrstev (index do `layerBoundaries`). */
  readonly layers?: Readonly<Record<number, GapList>>;
}

/** Část křivky mezi parametry t0 < t1. */
function subPath(p: Path, t0: number, t1: number): Path {
  let q = p;
  const b = pointAt(p, t1);
  if (t0 > 1e-9) q = splitPath(q, pointAt(p, t0))[1];
  if (t1 < 1 - 1e-9) q = splitPath(q, b)[0];
  return q;
}

/** Líc rozdělený mezerami na viditelné kusy (ve směru líce). */
export function facePieces(face: Path, gaps: GapList = []): Vec2[][] {
  const sorted = [...gaps]
    .map(([a, b]) => [Math.min(a, b), Math.max(a, b)] as const)
    .sort((x, y) => x[0] - y[0]);
  const out: Vec2[][] = [];
  let t = 0;
  for (const [a, b] of sorted) {
    if (a > t + 1e-6) out.push(tessellate(subPath(face, t, Math.min(a, 1))));
    t = Math.max(t, b);
  }
  if (t < 1 - 1e-6) out.push(tessellate(subPath(face, t, 1)));
  return out;
}

const same = (a: Vec2 | undefined, b: Vec2 | undefined) => !!a && !!b && dist(a, b) < 1e-6;

/** Spojí navazující kusy (v pořadí kolem obrysu) do lomených čar; jeden souvislý kruh = uzavřený. */
function joinPieces(pieces: Vec2[][]): OutlineRun[] {
  const runs: Vec2[][] = [];
  for (const p of pieces) {
    const last = runs[runs.length - 1];
    if (last && same(last[last.length - 1], p[0])) last.push(...p.slice(1));
    else runs.push([...p]);
  }
  const first = runs[0];
  const lastRun = runs[runs.length - 1];
  if (runs.length > 1 && first && lastRun && same(lastRun[lastRun.length - 1], first[0])) {
    runs[0] = [...lastRun, ...first.slice(1)];
    runs.pop();
  }
  return runs.map((points) => {
    const closed = points.length > 2 && same(points[0], points[points.length - 1]);
    return { points: closed ? points.slice(0, -1) : points, closed };
  });
}

/** Úseky obrysu; volné oba konce bez T = jeden uzavřený obrys. */
export function outlineRuns(g: WallGeometry, gaps: FaceGaps = {}): OutlineRun[] {
  const pieces: Vec2[][] = [...facePieces(g.faces.ref, gaps.ref)];
  const capShown = (e: 'start' | 'end') => g.cuts[e].join === 'free' || g.cuts[e].join === 'straight';
  if (capShown('end')) pieces.push(...facePieces(capPath(g, 'end'), gaps.caps?.end));
  const opp = facePieces(g.faces.opp, gaps.opp).map((p) => p.reverse());
  pieces.push(...opp.reverse());
  if (capShown('start')) {
    const caps = facePieces(capPath(g, 'start'), gaps.caps?.start).map((p) => p.reverse());
    pieces.push(...caps.reverse());
  }
  return joinPieces(pieces);
}
