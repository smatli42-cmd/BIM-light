// Dotaz na 3D pohledy pro AI a 3D okno: název, styl, filtr rekonstrukce, podlaží, ořezový kvádr.
import { S } from '../commands/schema.ts';
import { sunOf } from '../sun/position.ts';
import { defineQuery } from './types.ts';

export const view3dList = defineQuery<Record<string, never>, unknown>({
  name: 'view3d.list',
  label: '3D pohledy',
  description:
    '3D pohledy projektu: id, název, styl (id a název), filtr rekonstrukce, zobrazená podlaží (null = ' +
    'všechna), ořezový kvádr (mm, null = vypnutý), projekce, režim zobrazení, slunce (s vypočtenou ' +
    'polohou sunAzimuth / sunAltitude), rovina řezu a mřížka.',
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
      projection: v.projection,
      renderMode: v.renderMode,
      sun: v.sun,
      sunAzimuth: Math.round(sunOf(m, v.sun).azimuth * 10) / 10,
      sunAltitude: Math.round(sunOf(m, v.sun).altitude * 10) / 10,
      cutPlane: v.cutPlane,
      grid: v.grid,
      layersModified: Object.keys(v.local.layerStates ?? {}).length > 0,
    })),
});
