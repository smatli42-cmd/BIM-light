// Dotaz pro AI: skladby projektu (krok 3 editoru typů) – název, „Použít pro“, tloušťka, vrstvy
// a typy stěn, které skladbu sdílejí.
import { slabTypeUsers } from '../slab/queries.ts';
import { S } from '../commands/schema.ts';
import { compositionUsers } from '../composition/store.ts';
import type { CompositionUse } from '../composition/types.ts';
import type { Id } from '../ids/index.ts';
import { defineQuery } from './types.ts';

export interface CompositionRow {
  readonly id: Id;
  readonly name: string;
  readonly use: CompositionUse;
  readonly thickness: number;
  readonly layers: readonly { materialId: Id; material: string; thickness: number; function: string }[];
  readonly wallTypes: readonly { id: Id; name: string }[];
}

export const compositionList = defineQuery<Record<string, never>, CompositionRow[]>({
  name: 'composition.list',
  label: 'Skladby',
  description:
    'Skladby projektu (společné pro stěny, desky a střechy): id, název, použití (wall / slab / roof), ' +
    'celková tloušťka, vrstvy od referenční strany a typy stěn, které skladbu používají.',
  group: 'Skladba',
  params: S.object({}, []),
  run: (m) =>
    Object.values(m.compositions).map((c) => ({
      id: c.id,
      name: c.name,
      use: c.use,
      thickness: c.layers.reduce((s, l) => s + l.thickness, 0),
      layers: c.layers.map((l) => ({
        materialId: l.materialId,
        material: m.materials[l.materialId]?.name ?? '',
        thickness: l.thickness,
        function: l.function,
      })),
      wallTypes: compositionUsers(m, c.id).map((t) => ({ id: t.id, name: t.name })),
      slabTypes: slabTypeUsers(m, c.id).map((t) => ({ id: t.id, name: t.name })),
    })),
});
