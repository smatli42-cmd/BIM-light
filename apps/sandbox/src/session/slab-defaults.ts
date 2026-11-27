// Výchozí nastavení nové desky (nástroj Deska, D2; info box jako Ardit „Deska – výchozí nastavení“):
// typ, geometrická metoda, horní líc k podlaží a u metody „podle stěn“ líc nebo líc jádra.
import {
  typeHasCore,
  type Id,
  type Model,
  type ReferenceLine,
  type Status,
  type WallBoundary,
} from '@bim-light/core';

/**
 * Geometrická metoda: mnohoúhelník, obdélník, natočený obdélník, podle stěn (Revit „Vybrat stěny“),
 * podle místnosti (podlaha klikem do místnosti; obrys se s místností přepočítává).
 */
export type SlabMethod = 'polygon' | 'rect' | 'rotated' | 'walls' | 'room';

export interface SlabDefaults {
  typeId: Id;
  method: SlabMethod;
  /** Horní líc k podlaží (mm); null = podle funkce typu (podlaha 0, nosná deska −150). */
  topOffset: number | null;
  boundary: WallBoundary;
}

export const newSlabDefaults = (model: Model): SlabDefaults => ({
  typeId: Object.keys(model.slabTypes)[0] ?? '',
  method: 'polygon',
  topOffset: null,
  boundary: 'face',
});

/** Typy nových prvků mohly zmizet (smazání, vyčištění); bez jádra nejde „líc jádra“ (plán stěn Z1). */
export function keepNewTypes(s: {
  model: Model;
  wallTypeId: Id;
  wallRefLine: ReferenceLine;
  slab: SlabDefaults;
}) {
  if (!s.model.wallTypes[s.wallTypeId]) s.wallTypeId = Object.keys(s.model.wallTypes)[0] ?? '';
  const t = s.model.wallTypes[s.wallTypeId];
  if (s.wallRefLine === 'core-face' && t && !typeHasCore(t)) s.wallRefLine = 'face';
  if (!s.model.slabTypes[s.slab.typeId]) s.slab.typeId = Object.keys(s.model.slabTypes)[0] ?? '';
}

/** Společné parametry příkazu slab.create z nastavení nové desky (obrys doplní nástroj). */
export function slabCreateParams(s: { storeyId: Id; slab: SlabDefaults; options: { newStatus: Status } }) {
  const top = s.slab.topOffset;
  return {
    storeyId: s.storeyId,
    typeId: s.slab.typeId,
    status: s.options.newStatus,
    ...(top === null ? {} : { topOffset: top }),
  };
}
