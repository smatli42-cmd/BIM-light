// Příkaz: smazat výběr najednou (pravidla-interakce, kóty 12): vybrané stěny i kóty jedním krokem.
import type { Id } from '../../ids/index.ts';
import { removeDimensions } from '../../model/update.ts';
import { deleteElements } from '../../rules/delete.ts';
import { dimensionOf, wallOf } from '../lookup.ts';
import { S, type JsonSchema } from '../schema.ts';
import { defineCommand, fail } from '../types.ts';

const IDS = { type: 'array', items: S.id } as JsonSchema;

export const selectionDelete = defineCommand<{ wallIds?: Id[]; dimensionIds?: Id[] }>({
  name: 'selection.delete',
  label: 'Smazat vybrané',
  description: 'Smaže vybrané stěny (i s jejich kótami a napojeními) a vybrané kóty jedním krokem.',
  group: 'Úpravy',
  shortcut: 'Delete',
  params: S.object({ wallIds: IDS, dimensionIds: IDS }, []),
  run(model, p) {
    const walls = p.wallIds ?? [];
    const dims = p.dimensionIds ?? [];
    if (!walls.length && !dims.length) fail('invalid', 'Nic není vybráno');
    walls.forEach((id) => wallOf(model, id));
    dims.forEach((id) => dimensionOf(model, id));
    return { model: deleteElements(removeDimensions(model, dims), walls) };
  },
});
