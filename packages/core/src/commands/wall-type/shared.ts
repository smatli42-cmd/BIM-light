// Společné části příkazů typu stěny (plán stěn Z1): popis vrstvy (z něj vzniká řádek editoru
// i nástroj pro AI, základ 15b), uložení s validací, volný název, oprava referenční čáry.
import type { Id } from '../../ids/index.ts';
import type { Model } from '../../model/types.ts';
import { storeTypeCompositions, syncTypes } from '../../composition/store.ts';
import { putElements, putWallType } from '../../model/update.ts';
import { typeHasCore } from '../../wall-type/composition.ts';
import { LAYER_FUNCTIONS, type HeightBand, type WallLayer, type WallType } from '../../wall-type/types.ts';
import { wallTypeErrors } from '../../wall-type/validate.ts';
import { S, type JsonSchema } from '../schema.ts';
import { fail } from '../types.ts';

/** Vlastnosti vrstvy (popis parametrů, základ 15b). */
export const LAYER_FIELDS: Record<string, JsonSchema> = {
  materialId: { type: 'string', description: 'materiál (id z material.list)' },
  thickness: S.number('tloušťka vrstvy (mm)', { exclusiveMinimum: 0 }),
  function: S.enumOf(LAYER_FUNCTIONS, 'funkce: core = jádro, insulation = izolace, finish = povrch'),
  extendTop: S.number('prodloužení nahoře (mm)'),
  extendBottom: S.number('prodloužení dole (mm)'),
};

export const LAYER_SCHEMA = S.object(LAYER_FIELDS, ['materialId', 'thickness', 'function']);
export const BAND_INDEX: JsonSchema = { type: 'integer', minimum: 0, description: 'výškový pás (0 = první)' };
export const LAYER_INDEX: JsonSchema = {
  type: 'integer',
  minimum: 0,
  description: 'pořadí vrstvy od referenční strany (0 = první)',
};

export type LayerInput = Pick<WallLayer, 'materialId' | 'thickness' | 'function'> &
  Partial<Pick<WallLayer, 'extendTop' | 'extendBottom'>>;

export const toLayer = (l: LayerInput): WallLayer => ({ extendTop: 0, extendBottom: 0, ...l });

/** Pás typu podle indexu, nebo odmítnutí. */
export function bandOf(type: WallType, bandIndex = 0): HeightBand {
  return type.bands[bandIndex] ?? fail('not-found', `Typ ${type.name} nemá pás ${bandIndex}`);
}

/** Typ s upravenými vrstvami jednoho pásu. */
export function withLayers(type: WallType, bandIndex: number, layers: readonly WallLayer[]): WallType {
  bandOf(type, bandIndex);
  return { ...type, bands: type.bands.map((b, i) => (i === bandIndex ? { ...b, layers } : b)) };
}

/** Stěny s referenční čárou „líc jádra“ u typu bez jádra dostanou „líc“ (poloha se nemění: bez jádra je to totéž). */
export function normalizeRefLines(model: Model): Model {
  const fix = Object.values(model.elements).filter((w) => {
    const t = model.wallTypes[w.typeId];
    return w.referenceLine === 'core-face' && t && !typeHasCore(t);
  });
  return fix.length
    ? putElements(
        model,
        fix.map((w) => ({ ...w, referenceLine: 'face' as const })),
      )
    : model;
}

/** Uloží typ: validace skladby a jedinečný název; stěny typu bez jádra přepne na líc. */
/** Volná značka typu: S1, S2… (první nepoužité číslo). */
export function freeMark(model: Model, except?: Id): string {
  const used = new Set(
    Object.values(model.wallTypes)
      .filter((t) => t.id !== except)
      .map((t) => t.mark),
  );
  let i = 1;
  while (used.has(`S${i}`)) i++;
  return `S${i}`;
}

/** Značka je prázdná nebo ji má jiný typ? */
const markClash = (model: Model, type: WallType) =>
  !type.mark || Object.values(model.wallTypes).some((t) => t.id !== type.id && t.mark === type.mark);

/** Uloží platný typ; chybějící nebo obsazená značka dostane volnou (plán stěn Z8). */
export function putValidType(model: Model, given: WallType): Model {
  const type = markClash(model, given) ? { ...given, mark: freeMark(model, given.id) } : given;
  const errors = wallTypeErrors(type, (id) => !!model.materials[id]);
  if (errors.length) fail('invalid', errors.join('; '));
  const clash = Object.values(model.wallTypes).find((t) => t.id !== type.id && t.name === type.name);
  if (clash) fail('invalid', `Typ „${type.name}“ už v projektu je`);
  const stored = storeTypeCompositions(model, type);
  return normalizeRefLines(syncTypes(putWallType(stored.model, stored.type)));
}

/** Volný název typu: „X“, jinak „X (2)“, „X (3)“… */
export function freeTypeName(model: Model, wanted: string, except?: Id): string {
  const names = new Set(
    Object.values(model.wallTypes)
      .filter((t) => t.id !== except)
      .map((t) => t.name),
  );
  let name = wanted;
  for (let i = 2; names.has(name); i++) name = `${wanted} (${i})`;
  return name;
}
