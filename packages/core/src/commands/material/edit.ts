// Příkazy materiálu (katalog šraf a materiálů): vytvoř, duplikuj, uprav, smaž (s náhradou).
// Každý je jeden krok Undo (základ 6). Šrafu materiál jen odkazuje (základ 34).
import { DEFAULT_PRIORITY, type Material, type MaterialCategory } from '../../material/types.ts';
import { materialUsage } from '../../material/usage.ts';
import type { Model } from '../../model/types.ts';
import type { WallLayer } from '../../wall-type/types.ts';
import { S } from '../schema.ts';
import { defineCommand, fail } from '../types.ts';
import { freeName, MATERIAL_FIELDS, materialOf, putMaterial } from './shared.ts';

type Fields = Partial<Omit<Material, 'id' | 'source'>>;

export const materialCreate = defineCommand<
  Fields & { name: string; category: MaterialCategory; color: string; hatchId: string }
>({
  name: 'material.create',
  label: 'Nový materiál',
  description:
    'Vytvoří materiál: název (jedinečný), kategorie, barva (#rrggbb, 2D barvy se z ní odvodí), šrafa ' +
    '(id z hatch.list), volitelně pero šrafy, přepsané 2D barvy, průhlednost ve 3D, priorita protínání ' +
    '0–999 (výchozí podle kategorie) a poznámka.',
  group: 'Materiál',
  params: S.object(MATERIAL_FIELDS, ['name', 'category', 'color', 'hatchId']),
  run(model, p, ctx) {
    const m: Material = {
      hatchPen: 1,
      lineColor: null,
      fillColor: null,
      transparent3D: false,
      joinPriority: DEFAULT_PRIORITY[p.category],
      note: '',
      ...p,
      id: ctx.newId(),
    };
    return { model: putMaterial(model, m), created: [m.id] };
  },
});

export const materialDuplicate = defineCommand<{ materialId: string }>({
  name: 'material.duplicate',
  label: 'Duplikovat materiál',
  description: 'Vytvoří kopii materiálu s názvem „… (kopie)“; šrafa zůstane sdílená, ne zkopírovaná.',
  group: 'Materiál',
  params: S.object({ materialId: S.id }, ['materialId']),
  run(model, p, ctx) {
    const { source: _s, ...src } = materialOf(model, p.materialId);
    const m: Material = { ...src, id: ctx.newId(), name: freeName(model, src.name) };
    return { model: putMaterial(model, m), created: [m.id] };
  },
});

export const materialUpdate = defineCommand<Fields & { materialId: string }>({
  name: 'material.update',
  label: 'Upravit materiál',
  description:
    'Změní vlastnosti materiálu (jen zadané). Změna šrafy nebo barvy se projeví ve všech skladbách, ' +
    'které materiál používají.',
  group: 'Materiál',
  params: S.object({ materialId: S.id, ...MATERIAL_FIELDS }, ['materialId']),
  run(model, { materialId, ...fields }) {
    return { model: putMaterial(model, { ...materialOf(model, materialId), ...fields }) };
  },
});

function replaceInTypes(model: Model, from: string, to: string): Model {
  const wallTypes = Object.fromEntries(
    Object.entries(model.wallTypes).map(([id, t]) => [
      id,
      {
        ...t,
        bands: t.bands.map((b) => ({
          ...b,
          layers: b.layers.map((l) => (l.materialId === from ? { ...l, materialId: to } : l)),
        })),
      },
    ]),
  );
  const swap = (ls: readonly WallLayer[]) =>
    ls.map((l) => (l.materialId === from ? { ...l, materialId: to } : l));
  const compositions = Object.fromEntries(
    Object.entries(model.compositions).map(([id, c]) => [id, { ...c, layers: swap(c.layers) }]),
  );
  return { ...model, wallTypes, compositions };
}

export const materialDelete = defineCommand<{ materialId: string; replacementId?: string }>({
  name: 'material.delete',
  label: 'Smazat materiál',
  description:
    'Smaže materiál. Používá-li ho nějaká skladba, je nutná náhrada (replacementId): vrstvy dostanou ' +
    'náhradní materiál; bez náhrady se smazání odmítne a řekne, kolik prvků a skladeb materiál používá.',
  group: 'Materiál',
  params: S.object({ materialId: S.id, replacementId: S.id }, ['materialId']),
  run(model, p) {
    materialOf(model, p.materialId);
    const use = materialUsage(model, p.materialId);
    let m = model;
    if (use.types > 0) {
      if (!p.replacementId)
        fail('invalid', `Materiál používá ${use.elements} prvků a ${use.types} skladeb; zvol náhradu`);
      if (p.replacementId === p.materialId) fail('invalid', 'Náhrada musí být jiný materiál');
      materialOf(model, p.replacementId);
      m = replaceInTypes(model, p.materialId, p.replacementId);
    }
    const { [p.materialId]: _gone, ...materials } = m.materials;
    return { model: { ...m, materials } };
  },
});
