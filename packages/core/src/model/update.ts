// Pomocníci pro neměnné úpravy modelu. Používají je jen příkazy (základ 6).
import type { Dimension } from '../dimension/types.ts';
import type { Id } from '../ids/index.ts';
import type { Opening } from '../opening/types.ts';
import type { Relation } from '../relation/types.ts';
import type { DisplaySettings } from '../style/types.ts';
import type { View } from '../view/types.ts';
import type { WallType } from '../wall/types.ts';
import type { Element, Model, Storey } from './types.ts';

type Rec<T> = Readonly<Record<Id, T>>;

const put = <T extends { id: Id }>(rec: Rec<T>, item: T): Rec<T> => ({ ...rec, [item.id]: item });
/** Kopie záznamů bez daných id. */
export function omitIds<T>(rec: Rec<T>, ids: Iterable<Id>): Rec<T> {
  const gone = new Set(ids);
  return Object.fromEntries(Object.entries(rec).filter(([id]) => !gone.has(id)));
}
const drop = omitIds;

export const putElements = (m: Model, els: readonly Element[]): Model => ({
  ...m,
  elements: els.reduce(put, m.elements),
});
export const removeElements = (m: Model, ids: Iterable<Id>): Model => ({
  ...m,
  elements: drop(m.elements, ids),
});

export const putOpenings = (m: Model, ops: readonly Opening[]): Model => ({
  ...m,
  openings: ops.reduce(put, m.openings),
});
export const removeOpenings = (m: Model, ids: Iterable<Id>): Model => ({
  ...m,
  openings: drop(m.openings, ids),
});

export const putRelations = (m: Model, rels: readonly Relation[]): Model => ({
  ...m,
  relations: rels.reduce(put, m.relations),
});
export const removeRelations = (m: Model, ids: Iterable<Id>): Model => ({
  ...m,
  relations: drop(m.relations, ids),
});

export const putDimensions = (m: Model, dims: readonly Dimension[]): Model => ({
  ...m,
  dimensions: dims.reduce(put, m.dimensions),
});
export const removeDimensions = (m: Model, ids: Iterable<Id>): Model => ({
  ...m,
  dimensions: drop(m.dimensions, ids),
});

export const putWallType = (m: Model, t: WallType): Model => ({ ...m, wallTypes: put(m.wallTypes, t) });
export const putStorey = (m: Model, s: Storey): Model => ({ ...m, storeys: put(m.storeys, s) });
export const putView = (m: Model, v: View): Model => ({ ...m, views: put(m.views, v) });
export const setDisplay = (m: Model, display: DisplaySettings): Model => ({ ...m, display });
