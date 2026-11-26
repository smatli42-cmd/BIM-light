// Samočinné napojení konce stěny (základ 24), stejné pro myš i pro AI: konec na volném konci
// jiné stěny = roh (ATSTART / ATEND), konec na líci nebo ose jiné stěny = T napojení (ATPATH).
import {
  cross,
  dist,
  endPoint,
  mul,
  nearestOnPath,
  pathIntersections,
  tangentAt,
  type Path,
  type PathEnd,
  type Vec2,
} from '../geometry/index.ts';
import type { Id } from '../ids/index.ts';
import type { Model, Status } from '../model/types.ts';
import type { ConnectionType } from '../relation/types.ts';
import { allWallGeometry } from './geometry.ts';
import { allWalls, connectionsOf, endToType, sidesFor } from './queries.ts';

/** Tolerance shody bodu (mm). */
export const CONNECT_TOL = 1;

export interface AutoLink {
  readonly wallId: Id;
  readonly at: ConnectionType;
}

/**
 * Smí se stěny napojit podle stavu (fáze)? Nová a bouraná nikdy (nová příčka přes bouranou nesmí
 * po zbourání zůstat přerušená – pokyn uživatele 2026-11-26). Stávající se napojuje s oběma.
 */
export const canJoinStatus = (a: Status, b: Status): boolean =>
  !((a === 'new' && b === 'demolished') || (a === 'demolished' && b === 'new'));

/** Je konec stěny volný (bez napojení)? */
export const isFreeEnd = (m: Model, wallId: Id, end: PathEnd): boolean =>
  !connectionsOf(m, wallId).some((c) => sidesFor(c, wallId).own.at === endToType(end));

/** Směr nové stěny od jejího konce dovnitř stěny (pro výběr hostitele v T). */
export function inwardDir(path: Path, end: PathEnd): Vec2 {
  const t = tangentAt(path, end);
  return end === 'start' ? t : mul(t, -1);
}

/** Hostitel v T nesmí být se stěnou rovnoběžný (sin úhlu pod ~3°). */
const PARALLEL = 0.05;

/**
 * Kam se napojí konec ležící v bodě `p` na podlaží; null = nikam. Roh má přednost před T.
 * `status` = stav nové stěny (nová se nenapojí na bouranou). `dir` = směr nové stěny od tohoto konce: rovnoběžná stěna se jako hostitel v T přeskočí
 * (bod ve vnějším rohu leží na lících dvou stěn, napojit se má na tu kolmou).
 */
export function connectionAt(
  model: Model,
  storeyId: Id,
  p: Vec2,
  exclude: readonly Id[] = [],
  dir?: Vec2,
  status: Status = 'new',
): AutoLink | null {
  const walls = allWalls(model).filter(
    (w) => w.storeyId === storeyId && !exclude.includes(w.id) && canJoinStatus(w.status, status),
  );
  for (const w of walls)
    for (const end of ['start', 'end'] as const) {
      if (dist(endPoint(w.path, end), p) <= CONNECT_TOL && isFreeEnd(model, w.id, end))
        return { wallId: w.id, at: endToType(end) };
    }
  const geoms = allWallGeometry(model, storeyId);
  for (const w of walls) {
    const g = geoms.get(w.id);
    if (!g) continue;
    const on = (['ref', 'opp', 'axis'] as const).some(
      (f) => nearestOnPath(g.faces[f], p).distance <= CONNECT_TOL,
    );
    if (!on) continue;
    const hit = nearestOnPath(w.path, p);
    const t = tangentAt(w.path, hit.t < 0.5 ? 'start' : 'end');
    if (dir && Math.abs(cross(t, dir)) < PARALLEL) continue;
    return { wallId: w.id, at: 'ATPATH' };
  }
  return null;
}

/**
 * Stěny podlaží, které křivka protíná uprostřed (dál než `CONNECT_TOL` od konců obou) a se kterými
 * stěna `wallId` ještě nemá žádné napojení: kreslení přes stěnu = kříž X (plán stěn Z2).
 */
export function crossingWalls(model: Model, storeyId: Id, path: Path, wallId?: Id): Id[] {
  const linked = new Set(
    wallId ? connectionsOf(model, wallId).map((c) => sidesFor(c, wallId).other.wallId) : [],
  );
  const inside = (q: Vec2, p: Path) => dist(q, p.start) > CONNECT_TOL && dist(q, p.end) > CONNECT_TOL;
  const status = wallId ? model.elements[wallId]?.status : undefined;
  return allWalls(model)
    .filter((w) => w.storeyId === storeyId && w.id !== wallId && !linked.has(w.id))
    .filter((w) => !status || canJoinStatus(w.status, status))
    .filter((w) => pathIntersections(path, w.path).some((q) => inside(q, path) && inside(q, w.path)))
    .map((w) => w.id);
}
