// Společné části příkazů materiálu: schéma vlastností (z něj vzniká panel i nástroj pro AI,
// základ 15b), uložení materiálu a doplnění kopie šrafy do projektu (základy 21, 34).
import { hatchExists, withHatchesFor } from '../../hatch/project.ts';
import type { Id } from '../../ids/index.ts';
import { MATERIAL_CATEGORIES, type Material } from '../../material/types.ts';
import type { Model } from '../../model/types.ts';
import { S, type JsonSchema } from '../schema.ts';
import { fail } from '../types.ts';

const color: JsonSchema = { type: 'string', description: 'barva #rrggbb' };
const colorOrNull: JsonSchema = {
  oneOf: [color, { type: 'null' }],
  description: 'barva nebo null = odvodit',
};

/** Upravitelné vlastnosti materiálu (popis parametrů, základ 15b). */
export const MATERIAL_FIELDS: Record<string, JsonSchema> = {
  name: { type: 'string', description: 'název (klíč, v projektu jedinečný)' },
  category: S.enumOf(MATERIAL_CATEGORIES, 'kategorie'),
  color: color,
  hatchId: { type: 'string', description: 'id šrafy z knihovny šraf (hatch.list)' },
  hatchPen: { type: 'integer', minimum: 1, description: 'pero čar šrafy' },
  lineColor: colorOrNull,
  fillColor: colorOrNull,
  transparent3D: { type: 'boolean', description: 'průhledný ve 3D (sklo)' },
  joinLevelId: {
    oneOf: [{ type: 'string' }, { type: 'null' }],
    description: 'úroveň priority spojování (id z material.priorities) nebo null = podle kategorie',
  },
  note: { type: 'string', description: 'poznámka' },
};

export function materialOf(model: Model, id: Id): Material {
  return model.materials[id] ?? fail('not-found', `Materiál ${id} neexistuje`);
}

/** Uloží materiál; zkontroluje jedinečný název a existenci šrafy a doplní její kopii do projektu. */
export function putMaterial(model: Model, m: Material): Model {
  if (!m.name.trim()) fail('invalid', 'Materiál musí mít název');
  const clash = Object.values(model.materials).find((o) => o.id !== m.id && o.name === m.name);
  if (clash) fail('invalid', `Materiál „${m.name}“ už v projektu je`);
  if (!hatchExists(model.display, m.hatchId)) fail('not-found', `Šrafa ${m.hatchId} neexistuje`);
  if (m.joinLevelId !== null && !model.joinPriorities.levels.some((l) => l.id === m.joinLevelId))
    fail('not-found', `Úroveň priority ${m.joinLevelId} neexistuje`);
  const materials = { ...model.materials, [m.id]: m };
  return { ...model, materials, display: withHatchesFor(model.display, [m]) };
}

/** Volný název: „X (kopie)“, „X (kopie 2)“… */
export function freeName(model: Model, base: string): string {
  const names = new Set(Object.values(model.materials).map((m) => m.name));
  let name = `${base} (kopie)`;
  for (let i = 2; names.has(name); i++) name = `${base} (kopie ${i})`;
  return name;
}
