// Dotazy nad stěnami v modelu (bez změn dat).
import type { Id } from '../ids/index.ts';
import type { PathEnd } from '../geometry/index.ts';
import type { Model } from '../model/types.ts';
import type { ConnectionSide, ConnectionType, WallConnection } from '../relation/types.ts';
import { bandAt, crossSection, DEFAULT_CUT_HEIGHT, type CrossSection } from './layers.ts';
import type { Wall, WallType } from './types.ts';

export function getWall(model: Model, id: Id): Wall {
  const el = model.elements[id];
  if (!el || el.category !== 'wall') throw new Error(`Stěna ${id} neexistuje`);
  return el;
}

export function getWallType(model: Model, id: Id): WallType {
  const t = model.wallTypes[id];
  if (!t) throw new Error(`Typ stěny ${id} neexistuje`);
  return t;
}

export const allWalls = (model: Model): Wall[] =>
  Object.values(model.elements).filter((e): e is Wall => e.category === 'wall');

/** Příčný řez stěny v rovině řezu půdorysu. */
export function wallSection(model: Model, wall: Wall, cutHeight = DEFAULT_CUT_HEIGHT): CrossSection {
  const type = getWallType(model, wall.typeId);
  return crossSection(wall, bandAt(type, cutHeight - wall.height.baseOffset));
}

export const allConnections = (model: Model): WallConnection[] =>
  Object.values(model.relations).filter((r) => r.kind === 'wall-connection');

/** Napojení, kterých se stěna účastní. */
export const connectionsOf = (model: Model, wallId: Id): WallConnection[] =>
  allConnections(model).filter((c) => c.relating.wallId === wallId || c.related.wallId === wallId);

export const endToType = (end: PathEnd): ConnectionType => (end === 'start' ? 'ATSTART' : 'ATEND');
export const typeToEnd = (t: ConnectionType): PathEnd | null =>
  t === 'ATSTART' ? 'start' : t === 'ATEND' ? 'end' : null;

/** Strana vztahu patřící dané stěně a protější strana. */
export function sidesFor(c: WallConnection, wallId: Id): { own: ConnectionSide; other: ConnectionSide } {
  return c.relating.wallId === wallId
    ? { own: c.relating, other: c.related }
    : { own: c.related, other: c.relating };
}
