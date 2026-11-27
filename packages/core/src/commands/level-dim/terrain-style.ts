// Popisky kóty terénu ve stylu (DSP: RT = rostlý, UT = upravený terén) a které řádky se kreslí.
import type { Id } from '../../ids/index.ts';
import { setDisplay } from '../../model/update.ts';
import type { TerrainLabels } from '../../style/types.ts';
import { styleOf } from '../lookup.ts';
import { S } from '../schema.ts';
import { defineCommand } from '../types.ts';

export const styleSetTerrainLabels = defineCommand<{ styleId: Id } & Partial<TerrainLabels>>({
  name: 'style.setTerrainLabels',
  label: 'Popisky kóty terénu',
  description:
    'Kóta terénu v půdorysu u pohledů se stylem: rt / ut = popisky (výchozí RT a UT), show = co se kreslí ' +
    '(both = obojí, rt = jen rostlý, ut = jen upravený terén).',
  group: 'Zobrazení',
  params: S.object(
    {
      styleId: S.id,
      rt: { type: 'string' },
      ut: { type: 'string' },
      show: S.enumOf(['both', 'rt', 'ut'], 'co se kreslí'),
    },
    ['styleId'],
  ),
  run(model, p) {
    const style = styleOf(model, p.styleId);
    const old = style.terrainLabels ?? { rt: 'RT', ut: 'UT', show: 'both' as const };
    const terrainLabels: TerrainLabels = {
      rt: p.rt ?? old.rt,
      ut: p.ut ?? old.ut,
      show: p.show ?? old.show,
    };
    const d = model.display;
    return {
      model: setDisplay(model, { ...d, styles: { ...d.styles, [style.id]: { ...style, terrainLabels } } }),
    };
  },
});
