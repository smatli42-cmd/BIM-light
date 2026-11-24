// Načtení objektů pro příkazy; neexistující id = srozumitelné odmítnutí příkazu.
import type { Dimension } from '../dimension/types.ts';
import type { Id } from '../ids/index.ts';
import type { Model, Storey } from '../model/types.ts';
import type { Style } from '../style/types.ts';
import type { View } from '../view/types.ts';
import type { Wall, WallType } from '../wall/types.ts';
import { fail } from './types.ts';

export function wallOf(m: Model, id: Id): Wall {
  const el = m.elements[id];
  return el && el.category === 'wall' ? el : fail('not-found', `Stěna ${id} neexistuje`);
}

export const wallTypeOf = (m: Model, id: Id): WallType =>
  m.wallTypes[id] ?? fail('not-found', `Typ stěny ${id} neexistuje`);

export const storeyOf = (m: Model, id: Id): Storey =>
  m.storeys[id] ?? fail('not-found', `Podlaží ${id} neexistuje`);

export const dimensionOf = (m: Model, id: Id): Dimension =>
  m.dimensions[id] ?? fail('not-found', `Kóta ${id} neexistuje`);

export const viewOf = (m: Model, id: Id): View => m.views[id] ?? fail('not-found', `Pohled ${id} neexistuje`);

export const styleOf = (m: Model, id: Id): Style =>
  m.display.styles[id] ?? fail('not-found', `Styl ${id} neexistuje`);
