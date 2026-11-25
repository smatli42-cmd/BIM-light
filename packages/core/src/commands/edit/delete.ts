// Příkaz: smazat výběr najednou (pravidla-interakce, kóty 12): vybrané stěny, otvory i kóty jedním krokem.
import type { Id } from '../../ids/index.ts';
import { removeDimensions } from '../../model/update.ts';
import { deleteElements, deleteOpenings } from '../../rules/delete.ts';
import { openingOf } from '../opening/shared.ts';
import { dimensionOf, wallOf } from '../lookup.ts';
import { S, type JsonSchema } from '../schema.ts';
import { defineCommand, fail } from '../types.ts';

const IDS = { type: 'array', items: S.id } as JsonSchema;

export const selectionDelete = defineCommand<{ wallIds?: Id[]; dimensionIds?: Id[]; openingIds?: Id[] }>({
  name: 'selection.delete',
  label: 'Smazat vybrané',
  description:
    'Smaže vybrané stěny (i s jejich otvory, kótami a napojeními), vybrané otvory a kóty jedním krokem.',
  group: 'Úpravy',
  shortcut: 'Delete',
  params: S.object({ wallIds: IDS, dimensionIds: IDS, openingIds: IDS }, []),
  run(model, p) {
    const walls = p.wallIds ?? [];
    const dims = p.dimensionIds ?? [];
    const ops = p.openingIds ?? [];
    if (!walls.length && !dims.length && !ops.length) fail('invalid', 'Nic není vybráno');
    walls.forEach((id) => wallOf(model, id));
    dims.forEach((id) => dimensionOf(model, id));
    ops.forEach((id) => openingOf(model, id));
    const m = deleteOpenings(
      removeDimensions(model, dims),
      ops.filter((id) => model.openings[id]),
    );
    return { model: deleteElements(m, walls) };
  },
});
