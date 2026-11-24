// Dotazy pro AI: typy stěn v projektu (skladba, tloušťka, použití) a knihovna typů (plán stěn Z1).
import { S } from '../commands/schema.ts';
import type { Model } from '../model/types.ts';
import { bandThickness } from '../wall/layers.ts';
import { typeHasCore } from '../wall-type/composition.ts';
import { WALL_TYPE_LIBRARY } from '../wall-type/library.ts';
import type { WallType } from '../wall-type/types.ts';
import { wallTypeUsage } from '../wall-type/usage.ts';
import { defineQuery } from './types.ts';

function typeRow(m: Model, t: WallType) {
  return {
    id: t.id,
    name: t.name,
    thickness: t.bands[0] ? bandThickness(t.bands[0]) : 0,
    hasCore: typeHasCore(t),
    usage: wallTypeUsage(m, t.id),
    source: t.source ?? null,
    bands: t.bands.map((b) => ({
      height: b.height,
      layers: b.layers.map((l) => ({ ...l, material: m.materials[l.materialId]?.name ?? '?' })),
    })),
  };
}

export const wallTypeList = defineQuery<Record<string, never>, unknown>({
  name: 'wallType.list',
  label: 'Typy stěn',
  description:
    'Vrátí typy stěn projektu: id, název, tloušťka (mm, první pás), má jádro, použití (počet stěn), ' +
    'původ v knihovně a výškové pásy s vrstvami od referenční strany (materiál id + název, tloušťka, ' +
    'funkce, prodloužení nahoře a dole).',
  group: 'Typ stěny',
  params: S.object({}, []),
  run: (m) => Object.values(m.wallTypes).map((t) => typeRow(m, t)),
});

export const wallTypeLibrary = defineQuery<Record<string, never>, unknown>({
  name: 'wallType.library',
  label: 'Knihovna typů stěn',
  description:
    'Vrátí knihovnu typů stěn: klíč (pro wallType.load), název, vrstvy (klíč materiálu, tloušťka, funkce) ' +
    'a zda je typ už v projektu.',
  group: 'Typ stěny',
  params: S.object({}, []),
  run: (m) =>
    WALL_TYPE_LIBRARY.map((t) => ({
      key: t.key,
      name: t.name,
      layers: t.layers,
      inProject: Object.values(m.wallTypes).some((x) => x.source?.itemId === t.key),
    })),
});
