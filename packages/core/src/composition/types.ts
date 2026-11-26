// Skladba (rozhodnutí uživatele 2026-11-26, koncepce rozhraní 11a): samostatná položka projektu
// společná pro stěny, desky a střechy (vzor Arditu „Skladby“). Typ prvku na ni odkazuje z výškového pásu
// (`HeightBand.compositionId`); vrstvy pásu jsou její kopie, kterou drží jen `composition/store.ts`.
import type { Id } from '../ids/index.ts';
import type { WallLayer } from '../wall-type/types.ts';

/** Pro které prvky se skladba nabízí (zaškrtávátka „Použít pro“). */
export interface CompositionUse {
  readonly wall: boolean;
  readonly slab: boolean;
  readonly roof: boolean;
}

export interface Composition {
  readonly id: Id;
  readonly name: string;
  /** Vrstvy od referenční (vnitřní / spodní) strany. */
  readonly layers: readonly WallLayer[];
  readonly use: CompositionUse;
}

export const WALL_USE: CompositionUse = { wall: true, slab: false, roof: false };
export const USE_KEYS: readonly (keyof CompositionUse)[] = ['wall', 'slab', 'roof'];
