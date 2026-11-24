// Výsledek napojení (základ 4: počítá se z modelu, neukládá se).
import type { Vec2 } from '../geometry/index.ts';
import type { Id } from '../ids/index.ts';
import type { HalfPlane } from './half-plane.ts';

/** Druh konce stěny: volný, roh, T, v přímce, tři a více konců v uzlu. */
export type EndJoin = 'free' | 'corner' | 'tee' | 'straight' | 'multiple';

/**
 * Konec jedné vrstvy: vrstva = pás ∩ polorovina z některé varianty (u volného konce se stupněm
 * jsou varianty dvě, jinak jedna). `extend` = o kolik pás přesahuje konec referenční čáry,
 * `extras` = kousky navíc (omítka zahnutá přes čelo).
 */
export interface LayerEnd {
  readonly variants: readonly (readonly HalfPlane[])[];
  readonly extend: number;
  readonly extras: readonly (readonly Vec2[])[];
}

export interface EndResult {
  readonly join: EndJoin;
  readonly layers: readonly LayerEnd[];
}

/** Mezera ve vrstvě průběžné stěny: zůstane, co leží v jedné ze dvou polorovin (vně pásu jiné vrstvy). */
export interface Gap {
  readonly layer: number;
  readonly outside: readonly [HalfPlane, HalfPlane];
}

/** Výsledek jednoho uzlu: konce stěn (klíč „id:start|end“) a mezery průběžných stěn. */
export interface NodeResult {
  readonly ends: ReadonlyMap<string, EndResult>;
  readonly gaps: ReadonlyMap<Id, readonly Gap[]>;
}

export const sameCut = (cuts: readonly HalfPlane[], extend: number, count: number): LayerEnd[] =>
  Array.from({ length: count }, () => ({ variants: [cuts], extend, extras: [] }));
