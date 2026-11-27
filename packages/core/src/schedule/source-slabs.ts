// Zdroj výkazu „desky“ (desky D4, základ 8): jeden řádek = jedna deska; plocha, plocha bez otvorů,
// obvod, tloušťka podle skladby typu a objem (plocha bez všech otvorů × tloušťka). Plocha bez otvorů
// bere mez odečtu otvorů výkazu (jako u stěn: otvory do meze se neodečítají, z objemu vždy). Ruční
// podlaha odečte půdorys stěn (`slabScheduleArea`).
import type { Model } from '../model/types.ts';
import { polygonArea, slabArea, slabPerimeter, slabThickness } from '../slab/geometry.ts';
import { slabScheduleArea } from '../slab/floor-area.ts';
import { allSlabs } from '../slab/queries.ts';
import type { Slab } from '../slab/types.ts';
import { slabNetArea, slabOpeningsOf } from '../slab-opening/geometry.ts';
import { num, text, type ScheduleSourceDef } from './fields.ts';
import { STATUS_LABELS, variantLabel } from './source-walls.ts';
import type { ScheduleDef } from './types.ts';

const FUNCTION_LABELS: Readonly<Record<Slab['slabFunction'], string>> = {
  structure: 'nosná deska',
  floor: 'skladba podlahy',
};

/** Desky, které projdou filtrem definice (stejný filtr jako u stěn). */
export function filteredSlabs(m: Model, def: ScheduleDef): Slab[] {
  const f = def.filter;
  return allSlabs(m).filter(
    (s) =>
      (!f.storeyIds.length || f.storeyIds.includes(s.storeyId)) &&
      (!f.statuses.length || f.statuses.includes(s.status)) &&
      (f.variants === 'all' || s.variant.kind === 'main'),
  );
}

export const SLABS_SOURCE: ScheduleSourceDef = {
  label: 'Desky',
  fields: [
    text('mark', 'Značka'),
    text('type', 'Typ'),
    text('storey', 'Podlaží'),
    text('function', 'Funkce'),
    text('status', 'Stav'),
    text('variant', 'Varianta'),
    num('thickness', 'Tloušťka', 'mm', 0, false),
    num('area', 'Plocha', 'm²', 2),
    num('netArea', 'Plocha bez otvorů', 'm²', 2),
    num('perimeter', 'Obvod', 'm', 2),
    num('volume', 'Objem', 'm³', 3),
    num('openings', 'Počet otvorů', 'ks', 0),
    num('count', 'Počet', 'ks', 0),
  ],
  rows: (m, def) =>
    filteredSlabs(m, def).map((s) => {
      const t = m.slabTypes[s.typeId];
      const thickness = slabThickness(m, s.typeId);
      // Ruční podlaha přes více místností: bez půdorysu stěn (Revit, k potvrzení).
      const area = slabScheduleArea(m, s);
      const walls = slabArea(s) - area;
      const holes = slabOpeningsOf(m, s.id).map((o) => polygonArea(o.outline));
      const minHole = def.minOpeningArea * 1e6;
      const net = Math.max(0, area - holes.filter((h) => h > minHole).reduce((a, h) => a + h, 0));
      const solid = Math.max(0, slabNetArea(m, s) - walls);
      return {
        mark: t?.mark ?? '',
        type: t?.name ?? '',
        storey: m.storeys[s.storeyId]?.name ?? '',
        function: FUNCTION_LABELS[s.slabFunction],
        status: STATUS_LABELS[s.status],
        variant: variantLabel(m, s),
        thickness,
        area: area / 1e6,
        netArea: net / 1e6,
        perimeter: slabPerimeter(s) / 1000,
        volume: (solid * thickness) / 1e9,
        openings: holes.length,
        count: 1,
      };
    }),
};
