// Příkazy vrstev typu desky (editor typů, desky): přidej, smaž, přesuň, uprav vrstvu skladby typu.
// Vrstvy jsou od SPODNÍ strany nahoru. Mění se skladba (sdílená, koncepce rozhraní 11a) – změna platí
// pro všechny typy desek i stěn, které ji používají; horní líc desek zůstane, tloušťka roste dolů.
import { compositionUsers, syncTypes } from '../../composition/store.ts';
import type { Composition } from '../../composition/types.ts';
import type { Id } from '../../ids/index.ts';
import type { Model } from '../../model/types.ts';
import type { WallLayer } from '../../wall-type/types.ts';
import { wallTypeErrors } from '../../wall-type/validate.ts';
import { S, type JsonSchema } from '../schema.ts';
import { defineCommand, fail } from '../types.ts';
import {
  LAYER_FIELDS,
  LAYER_SCHEMA,
  normalizeRefLines,
  toLayer,
  type LayerInput,
} from '../wall-type/shared.ts';
import { slabTypeOf } from './shared.ts';

const GROUP = 'Typ desky';
const INDEX: JsonSchema = { type: 'integer', minimum: 0, description: 'pořadí vrstvy odspodu (0 = spodní)' };

function compositionOfType(m: Model, typeId: Id): Composition {
  const t = slabTypeOf(m, typeId);
  return m.compositions[t.compositionId] ?? fail('not-found', `Skladba ${t.compositionId} neexistuje`);
}

function layerAt(layers: readonly WallLayer[], i: number): WallLayer {
  return layers[i] ?? fail('not-found', `Skladba nemá vrstvu ${i}`);
}

/** Uloží nové vrstvy skladby typu desky; zkontroluje je i u typů stěn, které skladbu sdílejí. */
export function putSlabLayers(m: Model, typeId: Id, layers: readonly WallLayer[]): Model {
  const c = compositionOfType(m, typeId);
  if (layers.length === 0) fail('invalid', 'Skladba musí mít aspoň jednu vrstvu');
  layers.forEach((l, i) => {
    if (!(Number.isFinite(l.thickness) && l.thickness > 0))
      fail('invalid', `Tloušťka vrstvy musí být kladná (vrstva ${i + 1})`);
    if (!m.materials[l.materialId]) fail('invalid', `Materiál vrstvy neexistuje (vrstva ${i + 1})`);
  });
  const next = syncTypes({ ...m, compositions: { ...m.compositions, [c.id]: { ...c, layers } } });
  for (const w of compositionUsers(next, c.id)) {
    const errors = wallTypeErrors(w, (id) => !!next.materials[id]);
    if (errors.length) fail('invalid', `Skladbu sdílí typ stěny „${w.name}“: ${errors.join('; ')}`);
  }
  return normalizeRefLines(next);
}

export const slabTypeAddLayer = defineCommand<{ typeId: Id; index?: number; layer: LayerInput }>({
  name: 'slabType.addLayer',
  label: 'Přidat vrstvu desky',
  description:
    'Přidá vrstvu do skladby typu desky na pozici index (0 = úplně dole; výchozí navrch). Horní líc desek ' +
    'zůstane, deska zesílí dolů. Změna platí pro všechny typy se stejnou skladbou.',
  group: GROUP,
  params: S.object({ typeId: S.id, index: INDEX, layer: LAYER_SCHEMA }, ['typeId', 'layer']),
  run(model, p) {
    const layers = [...compositionOfType(model, p.typeId).layers];
    layers.splice(Math.min(p.index ?? layers.length, layers.length), 0, toLayer(p.layer));
    return { model: putSlabLayers(model, p.typeId, layers) };
  },
});

export const slabTypeRemoveLayer = defineCommand<{ typeId: Id; layerIndex: number }>({
  name: 'slabType.removeLayer',
  label: 'Smazat vrstvu desky',
  description: 'Smaže vrstvu ze skladby typu desky (layerIndex odspodu); poslední vrstvu smazat nejde.',
  group: GROUP,
  params: S.object({ typeId: S.id, layerIndex: INDEX }, ['typeId', 'layerIndex']),
  run(model, p) {
    const layers = compositionOfType(model, p.typeId).layers;
    layerAt(layers, p.layerIndex);
    const rest = layers.filter((_, i) => i !== p.layerIndex);
    return { model: putSlabLayers(model, p.typeId, rest) };
  },
});

export const slabTypeMoveLayer = defineCommand<{ typeId: Id; from: number; to: number }>({
  name: 'slabType.moveLayer',
  label: 'Přesunout vrstvu desky',
  description: 'Přesune vrstvu ve skladbě typu desky z pozice from na pozici to (0 = spodní vrstva).',
  group: GROUP,
  params: S.object({ typeId: S.id, from: INDEX, to: INDEX }, ['typeId', 'from', 'to']),
  run(model, p) {
    const layers = [...compositionOfType(model, p.typeId).layers];
    const moved = layerAt(layers, p.from);
    layerAt(layers, p.to);
    layers.splice(p.from, 1);
    layers.splice(p.to, 0, moved);
    return { model: putSlabLayers(model, p.typeId, layers) };
  },
});

const { extendTop: _t, extendBottom: _b, ...FIELDS } = LAYER_FIELDS;

export const slabTypeUpdateLayer = defineCommand<
  Partial<Pick<WallLayer, 'materialId' | 'thickness' | 'function'>> & { typeId: Id; layerIndex: number }
>({
  name: 'slabType.updateLayer',
  label: 'Upravit vrstvu desky',
  description:
    'Změní jednu vrstvu skladby typu desky (jen zadané): materiál, tloušťka (mm), funkce. Tloušťka desek ' +
    'typu se přepočítá (horní líc zůstane); změna platí pro všechny typy se stejnou skladbou.',
  group: GROUP,
  params: S.object({ typeId: S.id, layerIndex: INDEX, ...FIELDS }, ['typeId', 'layerIndex']),
  run(model, { typeId, layerIndex, ...fields }) {
    const layers = compositionOfType(model, typeId).layers;
    const next = { ...layerAt(layers, layerIndex), ...fields };
    return {
      model: putSlabLayers(
        model,
        typeId,
        layers.map((l, i) => (i === layerIndex ? next : l)),
      ),
    };
  },
});
