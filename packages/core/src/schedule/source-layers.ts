// Zdroj výkazu „vrstvy stěn“ (výkaz materiálů, plán stěn Z8): jeden řádek = jedna vrstva jedné stěny.
import type { LayerFunction } from '../wall-type/types.ts';
import { num, text, type ScheduleSourceDef } from './fields.ts';
import { wallQuantities } from './quantities.ts';
import { filteredWalls, LABEL_FIELDS, wallLabels } from './source-walls.ts';

const FUNCTION_LABELS: Readonly<Record<LayerFunction, string>> = {
  core: 'jádro',
  insulation: 'izolace',
  finish: 'povrch',
};

export const LAYERS_SOURCE: ScheduleSourceDef = {
  label: 'Vrstvy stěn (materiály)',
  fields: [
    text('material', 'Materiál'),
    text('layerFunction', 'Funkce vrstvy'),
    num('layerThickness', 'Tloušťka vrstvy', 'mm', 1, false),
    ...LABEL_FIELDS,
    num('area', 'Plocha', 'm²', 2),
    num('volume', 'Objem', 'm³', 3),
    num('count', 'Počet vrstev', 'ks', 0),
  ],
  rows: (m, def) =>
    filteredWalls(m, def).flatMap((w) => {
      const labels = wallLabels(m, w);
      return wallQuantities(m, w, def.minOpeningArea).layers.map((l) => ({
        ...labels,
        material: m.materials[l.span.layer.materialId]?.name ?? '',
        layerFunction: FUNCTION_LABELS[l.span.layer.function],
        layerThickness: l.span.layer.thickness,
        area: l.area,
        volume: l.volume,
        count: 1,
      }));
    }),
};
