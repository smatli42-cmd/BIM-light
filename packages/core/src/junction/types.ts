// Výsledek napojení (základ 4: počítá se z modelu, neukládá se).
import type { Vec2 } from '../geometry/index.ts';
import type { Id } from '../ids/index.ts';
import type { Cut } from './half-plane.ts';

/** Druh konce stěny: volný, roh, T, v přímce, tři a více konců v uzlu. */
export type EndJoin = 'free' | 'corner' | 'tee' | 'straight' | 'multiple';

/**
 * Konec jedné vrstvy: vrstva = pás ∩ polorovina z některé varianty (u volného konce se stupněm
 * jsou varianty dvě, jinak jedna). `extend` = o kolik pás přesahuje konec referenční čáry,
 * `extras` = kousky navíc (omítka zahnutá přes čelo).
 */
export interface LayerEnd {
  readonly variants: readonly (readonly Cut[])[];
  readonly extend: number;
  readonly extras: readonly (readonly Vec2[])[];
}

export interface EndResult {
  readonly join: EndJoin;
  readonly layers: readonly LayerEnd[];
}

/**
 * Mezera ve vrstvě průběžné stěny: zůstane, co leží v jedné z oblastí `keep` (každá = průnik polorovin,
 * oblasti se nepřekrývají). T a kříž: vně pásu jiné vrstvy; otvor: před a za otvorem (Z4).
 * `extras` = kousky přidané po všech mezerách (omítka zahnutá do ostění).
 */
export interface Gap {
  readonly layer: number;
  readonly keep: readonly (readonly Cut[])[];
  readonly extras?: readonly (readonly Vec2[])[];
}

/** Výsledek jednoho uzlu: konce stěn (klíč „id:start|end“) a mezery průběžných stěn. */
export interface NodeResult {
  readonly ends: ReadonlyMap<string, EndResult>;
  readonly gaps: ReadonlyMap<Id, readonly Gap[]>;
}

export const sameCut = (cuts: readonly Cut[], extend: number, count: number): LayerEnd[] =>
  Array.from({ length: count }, () => ({ variants: [cuts], extend, extras: [] }));
