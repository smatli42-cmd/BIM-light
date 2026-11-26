// Příkazy knihovny typů stěn (plán stěn Z1): vytvoř, duplikuj, přejmenuj, smaž (použitý jen
// s náhradou), vyčisti nepoužité. Každý je jeden krok Undo (základ 6).
import type { Id } from '../../ids/index.ts';
import type { Model } from '../../model/types.ts';
import { putElements } from '../../model/update.ts';
import type { WallType } from '../../wall-type/types.ts';
import { unusedWallTypes } from '../../wall-type/usage.ts';
import { wallTypeOf } from '../lookup.ts';
import { S, type JsonSchema } from '../schema.ts';
import { defineCommand, fail } from '../types.ts';
import { DEFAULT_WALL_PROPERTIES, type WallProperties } from '../../wall-props/types.ts';
import { TYPE_PROPERTIES_SCHEMA } from '../../wall-props/params.ts';
import {
  freeTypeName,
  LAYER_SCHEMA,
  normalizeRefLines,
  putValidType,
  toLayer,
  type LayerInput,
} from './shared.ts';

const LAYERS: JsonSchema = { type: 'array', items: LAYER_SCHEMA, minItems: 1, description: 'vrstvy' };
const BANDS: JsonSchema = {
  type: 'array',
  minItems: 1,
  description: 'výškové pásy zdola; poslední má height null (až do vršku)',
  items: S.object({ height: { oneOf: [{ type: 'number' }, { type: 'null' }] }, layers: LAYERS }, [
    'height',
    'layers',
  ]),
};

interface CreateParams {
  name: string;
  layers?: LayerInput[];
  bands?: { height: number | null; layers: LayerInput[] }[];
  properties?: Partial<WallProperties>;
}

export const wallTypeCreate = defineCommand<CreateParams>({
  name: 'wallType.create',
  label: 'Nový typ stěny',
  description:
    'Vytvoří typ stěny: název (jedinečný) a vrstvy od referenční (vnitřní) strany (materiál, tloušťka mm, ' +
    'funkce core / insulation / finish, prodloužení nahoře a dole). Jádro musí být jedna souvislá skupina. ' +
    'Místo „layers“ jde zadat „bands“ (výškové pásy). Tloušťka typu = součet vrstev. ' +
    'Volitelně „properties“ (funkce, nosná, vnější, požární odolnost, neprůzvučnost).',
  group: 'Typ stěny',
  params: S.object(
    {
      name: { type: 'string', description: 'název' },
      layers: LAYERS,
      bands: BANDS,
      properties: TYPE_PROPERTIES_SCHEMA,
    },
    ['name'],
  ),
  run(model, p, ctx) {
    if (!p.layers === !p.bands) fail('invalid-params', 'Zadej buď „layers“, nebo „bands“');
    const bands = p.bands
      ? p.bands.map((b) => ({ height: b.height, layers: b.layers.map(toLayer) }))
      : [{ height: null, layers: (p.layers ?? []).map(toLayer) }];
    const properties = { ...DEFAULT_WALL_PROPERTIES, ...p.properties };
    const type: WallType = { id: ctx.newId(), name: p.name.trim(), mark: '', bands, properties };
    return { model: putValidType(model, type), created: [type.id] };
  },
});

export const wallTypeDuplicate = defineCommand<{ typeId: Id; name?: string }>({
  name: 'wallType.duplicate',
  label: 'Duplikovat typ',
  description: 'Vytvoří kopii typu stěny (název „… (2)“ nebo zadaný). Kopie nemá odkaz na knihovnu.',
  group: 'Typ stěny',
  params: S.object({ typeId: S.id, name: { type: 'string', description: 'název kopie' } }, ['typeId']),
  run(model, p, ctx) {
    const { source: _s, ...src } = wallTypeOf(model, p.typeId);
    const name = freeTypeName(model, p.name?.trim() || src.name);
    const type: WallType = { ...src, id: ctx.newId(), name, mark: '' };
    return { model: putValidType(model, type), created: [type.id] };
  },
});

export const wallTypeRename = defineCommand<{ typeId: Id; name: string }>({
  name: 'wallType.rename',
  label: 'Přejmenovat typ',
  description: 'Přejmenuje typ stěny (název musí být v projektu jedinečný).',
  group: 'Typ stěny',
  params: S.object({ typeId: S.id, name: { type: 'string', description: 'nový název' } }, ['typeId', 'name']),
  run: (model, p) => ({
    model: putValidType(model, { ...wallTypeOf(model, p.typeId), name: p.name.trim() }),
  }),
});

function removeType(model: Model, typeId: Id): Model {
  const { [typeId]: _gone, ...wallTypes } = model.wallTypes;
  return { ...model, wallTypes };
}

export const wallTypeDelete = defineCommand<{ typeId: Id; replacementId?: Id }>({
  name: 'wallType.delete',
  label: 'Smazat typ',
  description:
    'Smaže typ stěny. Používají-li ho stěny, je nutná náhrada (replacementId): stěny dostanou náhradní typ, ' +
    'referenční čára zůstane na místě. Bez náhrady se smazání odmítne a řekne, kolik stěn typ používá.',
  group: 'Typ stěny',
  params: S.object({ typeId: S.id, replacementId: S.id }, ['typeId']),
  run(model, p) {
    wallTypeOf(model, p.typeId);
    if (Object.keys(model.wallTypes).length <= 1) fail('invalid', 'Projekt musí mít aspoň jeden typ stěny');
    const used = Object.values(model.elements).filter((w) => w.typeId === p.typeId);
    let m = model;
    if (used.length > 0) {
      if (!p.replacementId) fail('invalid', `Typ používá ${used.length} stěn; zvol náhradu`);
      if (p.replacementId === p.typeId) fail('invalid', 'Náhrada musí být jiný typ');
      wallTypeOf(model, p.replacementId);
      m = putElements(
        m,
        used.map((w) => ({ ...w, typeId: p.replacementId as Id })),
      );
    }
    return { model: normalizeRefLines(removeType(m, p.typeId)) };
  },
});

export const wallTypePurgeUnused = defineCommand<Record<string, never>>({
  name: 'wallType.purgeUnused',
  label: 'Vyčistit nepoužité typy',
  description:
    'Smaže typy stěn, které nepoužívá žádná stěna (jako Purge v Revitu). Jeden typ v projektu vždy zůstane.',
  group: 'Typ stěny',
  params: S.object({}, []),
  run(model) {
    let unused = unusedWallTypes(model);
    if (unused.length === Object.keys(model.wallTypes).length) unused = unused.slice(1);
    if (unused.length === 0) fail('invalid', 'Žádný nepoužitý typ ke smazání');
    return { model: unused.reduce(removeType, model) };
  },
});
