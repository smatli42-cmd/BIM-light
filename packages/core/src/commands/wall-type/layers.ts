// Příkazy vrstev typu stěny (plán stěn Z1): přidej, smaž, přesuň, uprav (materiál, tloušťka,
// funkce, prodloužení). Změna platí pro všechny stěny typu; referenční čára stěn zůstane na místě.
import type { Id } from '../../ids/index.ts';
import type { WallLayer } from '../../wall-type/types.ts';
import { wallTypeOf } from '../lookup.ts';
import { S } from '../schema.ts';
import { defineCommand, fail } from '../types.ts';
import {
  BAND_INDEX,
  bandOf,
  LAYER_FIELDS,
  LAYER_INDEX,
  LAYER_SCHEMA,
  putValidType,
  toLayer,
  withLayers,
  type LayerInput,
} from './shared.ts';

const GROUP = 'Typ stěny';

function layerAt(layers: readonly WallLayer[], i: number): WallLayer {
  return layers[i] ?? fail('not-found', `Pás nemá vrstvu ${i}`);
}

export const wallTypeAddLayer = defineCommand<{
  typeId: Id;
  bandIndex?: number;
  index?: number;
  layer: LayerInput;
}>({
  name: 'wallType.addLayer',
  label: 'Přidat vrstvu',
  description:
    'Přidá vrstvu do skladby typu stěny na pozici index (výchozí na konec, tj. na stranu tloušťky). ' +
    'Stěny typu se rozšíří na stranu tloušťky, referenční čára zůstane.',
  group: GROUP,
  params: S.object({ typeId: S.id, bandIndex: BAND_INDEX, index: LAYER_INDEX, layer: LAYER_SCHEMA }, [
    'typeId',
    'layer',
  ]),
  run(model, p) {
    const t = wallTypeOf(model, p.typeId);
    const bi = p.bandIndex ?? 0;
    const layers = [...bandOf(t, bi).layers];
    const at = Math.min(p.index ?? layers.length, layers.length);
    layers.splice(at, 0, toLayer(p.layer));
    return { model: putValidType(model, withLayers(t, bi, layers)) };
  },
});

export const wallTypeRemoveLayer = defineCommand<{ typeId: Id; bandIndex?: number; layerIndex: number }>({
  name: 'wallType.removeLayer',
  label: 'Smazat vrstvu',
  description: 'Smaže vrstvu ze skladby typu stěny (poslední vrstvu pásu smazat nejde).',
  group: GROUP,
  params: S.object({ typeId: S.id, bandIndex: BAND_INDEX, layerIndex: LAYER_INDEX }, [
    'typeId',
    'layerIndex',
  ]),
  run(model, p) {
    const t = wallTypeOf(model, p.typeId);
    const bi = p.bandIndex ?? 0;
    const layers = bandOf(t, bi).layers;
    layerAt(layers, p.layerIndex);
    if (layers.length === 1) fail('invalid', 'Pás musí mít aspoň jednu vrstvu');
    const rest = layers.filter((_, i) => i !== p.layerIndex);
    return { model: putValidType(model, withLayers(t, bi, rest)) };
  },
});

export const wallTypeMoveLayer = defineCommand<{ typeId: Id; bandIndex?: number; from: number; to: number }>({
  name: 'wallType.moveLayer',
  label: 'Přesunout vrstvu',
  description: 'Přesune vrstvu ve skladbě z pozice from na pozici to (0 = referenční strana).',
  group: GROUP,
  params: S.object({ typeId: S.id, bandIndex: BAND_INDEX, from: LAYER_INDEX, to: LAYER_INDEX }, [
    'typeId',
    'from',
    'to',
  ]),
  run(model, p) {
    const t = wallTypeOf(model, p.typeId);
    const bi = p.bandIndex ?? 0;
    const layers = [...bandOf(t, bi).layers];
    const moved = layerAt(layers, p.from);
    layerAt(layers, p.to);
    layers.splice(p.from, 1);
    layers.splice(p.to, 0, moved);
    return { model: putValidType(model, withLayers(t, bi, layers)) };
  },
});

export const wallTypeUpdateLayer = defineCommand<
  Partial<WallLayer> & { typeId: Id; bandIndex?: number; layerIndex: number }
>({
  name: 'wallType.updateLayer',
  label: 'Upravit vrstvu',
  description:
    'Změní vlastnosti jedné vrstvy (jen zadané): materiál, tloušťka, funkce, prodloužení nahoře a dole. ' +
    'Změna platí pro všechny stěny typu; referenční čára stěn zůstane na místě.',
  group: GROUP,
  params: S.object({ typeId: S.id, bandIndex: BAND_INDEX, layerIndex: LAYER_INDEX, ...LAYER_FIELDS }, [
    'typeId',
    'layerIndex',
  ]),
  run(model, { typeId, bandIndex, layerIndex, ...fields }) {
    const t = wallTypeOf(model, typeId);
    const bi = bandIndex ?? 0;
    const layers = bandOf(t, bi).layers;
    const next = { ...layerAt(layers, layerIndex), ...fields };
    const updated = layers.map((l, i) => (i === layerIndex ? next : l));
    return { model: putValidType(model, withLayers(t, bi, updated)) };
  },
});
