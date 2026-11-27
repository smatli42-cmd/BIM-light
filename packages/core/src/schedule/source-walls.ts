// Zdroj výkazu „stěny“ (plán stěn Z8): jeden řádek = jedna stěna; délka, plochy, objem a vlastnosti.
import type { Model, Status } from '../model/types.ts';
import { allWalls } from '../wall/queries.ts';
import type { Wall } from '../wall/types.ts';
import { WALL_FUNCTION_LABELS } from '../wall-props/params.ts';
import { wallProperties } from '../wall-props/resolve.ts';
import { num, text, type ScheduleSourceDef } from './fields.ts';
import { wallQuantities } from './quantities.ts';
import type { ScheduleDef, ScheduleRow } from './types.ts';

export const STATUS_LABELS: Readonly<Record<Status, string>> = {
  existing: 'stávající',
  demolished: 'bourání',
  new: 'nový',
};

/** Název varianty prvku (hlavní model, nebo „sada – varianta“). */
export function variantLabel(m: Model, w: Pick<Wall, 'variant'>): string {
  if (w.variant.kind === 'main') return 'hlavní model';
  const { setId, variantId } = w.variant;
  const set = m.variantSets[setId];
  return `${set?.name ?? '?'} – ${set?.variants.find((v) => v.id === variantId)?.name ?? '?'}`;
}

/** Stěny, které projdou filtrem definice. */
export function filteredWalls(m: Model, def: ScheduleDef): Wall[] {
  const f = def.filter;
  return allWalls(m).filter(
    (w) =>
      (!f.storeyIds.length || f.storeyIds.includes(w.storeyId)) &&
      (!f.statuses.length || f.statuses.includes(w.status)) &&
      (f.variants === 'all' || w.variant.kind === 'main'),
  );
}

/** Popisné sloupce stěny společné pro výkaz stěn i materiálů. */
export function wallLabels(m: Model, w: Wall): ScheduleRow {
  const t = m.wallTypes[w.typeId];
  const p = wallProperties(m, w);
  return {
    mark: t?.mark ?? '',
    type: t?.name ?? '',
    storey: m.storeys[w.storeyId]?.name ?? '',
    status: STATUS_LABELS[w.status],
    variant: variantLabel(m, w),
    function: WALL_FUNCTION_LABELS[p.function],
    loadBearing: p.loadBearing,
    isExternal: p.isExternal,
    fireRating: p.fireRating,
    acousticRating: p.acousticRating,
  };
}

export const LABEL_FIELDS = [
  text('mark', 'Značka'),
  text('type', 'Typ'),
  text('storey', 'Podlaží'),
  text('status', 'Stav'),
  text('variant', 'Varianta'),
  text('function', 'Funkce'),
  text('loadBearing', 'Nosná'),
  text('isExternal', 'Vnější'),
  text('fireRating', 'Požární odolnost'),
  text('acousticRating', 'Neprůzvučnost'),
];

export const WALLS_SOURCE: ScheduleSourceDef = {
  label: 'Stěny',
  fields: [
    ...LABEL_FIELDS,
    num('thickness', 'Tloušťka', 'mm', 0, false),
    num('length', 'Délka', 'm', 2),
    num('height', 'Výška', 'm', 2, false),
    num('grossArea', 'Plocha hrubá', 'm²', 2),
    num('openingArea', 'Otvory', 'm²', 2),
    num('netArea', 'Plocha čistá', 'm²', 2),
    num('volume', 'Objem', 'm³', 3),
    num('openings', 'Počet otvorů', 'ks', 0),
    num('count', 'Počet', 'ks', 0),
  ],
  rows: (m, def) =>
    filteredWalls(m, def).map((w) => {
      const q = wallQuantities(m, w, def.minOpeningArea);
      const thickness = q.layers.reduce((s, l) => s + Math.abs(l.span.to - l.span.from), 0);
      return {
        ...wallLabels(m, w),
        thickness,
        length: q.length,
        height: q.height,
        grossArea: q.grossArea,
        openingArea: q.openingArea,
        netArea: q.netArea,
        volume: q.volume,
        openings: q.openings,
        count: 1,
      };
    }),
};
