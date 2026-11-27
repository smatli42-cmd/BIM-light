// Vestavěná knihovna elektro typů podle ČSN EN 60617 (koncepce 3): přístroje, zařízení, svítidla,
// rozvaděče. Nový projekt dostane kopii celé knihovny se stálými id „et-<klíč>“ a odkazem na původ.
import type { Id } from '../ids/index.ts';
import { BOARD_ITEMS, EQUIPMENT_ITEMS } from './library-equipment.ts';
import { DEVICE_ITEMS } from './library-devices.ts';
import { typeFromLibrary, type ElectroLibraryItem } from './library-item.ts';
import { LIGHT_ITEMS } from './library-lights.ts';
import type { ElectroType } from './types.ts';
import { LEGEND_TEXT } from './legend-order.ts';

export { electroTypeId, ELECTRO_LIBRARY_ID } from './library-item.ts';

/** Knihovna; typy z legendy uživatele mají popis podle legendy (sloupec „Popis“). */
export const ELECTRO_LIBRARY: readonly ElectroLibraryItem[] = [
  ...DEVICE_ITEMS,
  ...EQUIPMENT_ITEMS,
  ...LIGHT_ITEMS,
  ...BOARD_ITEMS,
].map((i) => (LEGEND_TEXT[i.key] ? { ...i, description: LEGEND_TEXT[i.key] ?? i.description } : i));

export const electroLibraryTypes = (): Record<Id, ElectroType> =>
  Object.fromEntries(ELECTRO_LIBRARY.map((i) => typeFromLibrary(i)).map((t) => [t.id, t]));
