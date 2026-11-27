// Dotaz na 3D pohledy pro AI a 3D okno: název, styl, filtr rekonstrukce, podlaží, ořezový kvádr.
import { S } from '../commands/schema.ts';
import { defineQuery } from './types.ts';

export const view3dList = defineQuery<Record<string, never>, unknown>({
  name: 'view3d.list',
  label: '3D pohledy',
  description:
    '3D pohledy projektu: id, název, styl (id a název), filtr rekonstrukce, zobrazená podlaží (null = ' +
    'všechna) a ořezový kvádr (mm, null = vypnutý).',
  group: 'Zobrazení',
  params: S.object({}, []),
  run: (m) =>
    Object.values(m.views3d).map((v) => ({
      id: v.id,
      name: v.name,
      styleId: v.styleId,
      styleName: m.display.styles[v.styleId]?.name ?? '',
      phaseFilterId: v.phaseFilterId,
      storeyIds: v.storeyIds,
      storeyNames: v.storeyIds?.map((id) => m.storeys[id]?.name ?? '?') ?? null,
      sectionBox: v.sectionBox,
      layersModified: Object.keys(v.local.layerStates ?? {}).length > 0,
    })),
});
