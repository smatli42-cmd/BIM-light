// Příkaz: načíst typ z knihovny typů do projektu (základ 21: kopie s odkazem na původ).
// Chybějící materiály se načtou z knihovny materiálů s kopiemi šraf (základ 34).
import type { IdGenerator } from '../../ids/index.ts';
import { BASIC_MATERIALS, MATERIAL_LIBRARY_ID } from '../../material/library.ts';
import type { Model } from '../../model/types.ts';
import { libraryWallTypeByKey, WALL_TYPE_LIBRARY, wallTypeFromLibrary } from '../../wall-type/library.ts';
import { putMaterial } from '../material/shared.ts';
import { S } from '../schema.ts';
import { defineCommand, fail } from '../types.ts';
import { freeTypeName, putValidType } from './shared.ts';

/** Id materiálu z knihovny v projektu; chybí-li, doplní jeho kopii. */
function ensureMaterial(model: Model, key: string, newId: IdGenerator): { model: Model; id: string } {
  const found = Object.values(model.materials).find(
    (m) => m.source?.libraryId === MATERIAL_LIBRARY_ID && m.source.itemId === key,
  );
  if (found) return { model, id: found.id };
  const lib =
    BASIC_MATERIALS.find((m) => m.key === key) ?? fail('not-found', `Materiál ${key} není v knihovně`);
  const { key: _k, ...rest } = lib;
  const taken = Object.values(model.materials).some((m) => m.name === rest.name);
  const id = newId();
  const material = {
    ...rest,
    id,
    name: taken ? `${rest.name} (knihovna)` : rest.name,
    source: { libraryId: MATERIAL_LIBRARY_ID, itemId: key, version: 1 },
  };
  return { model: putMaterial(model, material), id };
}

export const wallTypeLoad = defineCommand<{ key: string }>({
  name: 'wallType.load',
  label: 'Načíst typ z knihovny',
  description:
    'Načte typ stěny z knihovny typů (klíč z wallType.library) do projektu jako kopii s odkazem na původ. ' +
    'Chybějící materiály doplní z knihovny materiálů.',
  group: 'Typ stěny',
  params: S.object(
    {
      key: S.enumOf(
        WALL_TYPE_LIBRARY.map((t) => t.key),
        'klíč typu v knihovně',
      ),
    },
    ['key'],
  ),
  run(model, p, ctx) {
    const item = libraryWallTypeByKey(p.key) ?? fail('not-found', `Typ ${p.key} není v knihovně`);
    if (Object.values(model.wallTypes).some((t) => t.source?.itemId === p.key))
      fail('invalid', `Typ „${item.name}“ už v projektu je`);
    let m = model;
    const ids: Record<string, string> = {};
    for (const l of item.layers) {
      const r = ensureMaterial(m, l.material, ctx.newId);
      m = r.model;
      ids[l.material] = r.id;
    }
    const type = wallTypeFromLibrary(item, (k) => ids[k] ?? '', ctx.newId);
    const named = { ...type, name: freeTypeName(m, type.name) };
    return { model: putValidType(m, named), created: [named.id] };
  },
});
