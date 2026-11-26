// Zdroj „typy stěn“ (legenda skladeb, plán stěn Z8): jeden řádek = jeden typ; skladba jako text
// (od referenční strany), vlastnosti typu a počet a délka stěn typu podle filtru.
import { bandAt, bandThickness, DEFAULT_CUT_HEIGHT } from '../wall/layers.ts';
import { WALL_FUNCTION_LABELS } from '../wall-props/params.ts';
import { typeProperties } from '../wall-props/resolve.ts';
import { num, text, type ScheduleSourceDef } from './fields.ts';
import { wallQuantities } from './quantities.ts';
import { filteredWalls } from './source-walls.ts';

const fmt = (v: number) => String(Math.round(v * 10) / 10).replace('.', ',');

export const TYPES_SOURCE: ScheduleSourceDef = {
  label: 'Typy stěn (legenda skladeb)',
  fields: [
    text('mark', 'Značka'),
    text('type', 'Typ'),
    num('thickness', 'Tloušťka', 'mm', 0, false),
    text('composition', 'Skladba'),
    text('function', 'Funkce'),
    text('loadBearing', 'Nosná'),
    text('isExternal', 'Vnější'),
    text('fireRating', 'Požární odolnost'),
    text('acousticRating', 'Neprůzvučnost'),
    num('length', 'Délka stěn', 'm', 2),
    num('count', 'Počet stěn', 'ks', 0),
  ],
  rows(m, def) {
    const walls = filteredWalls(m, def);
    return Object.values(m.wallTypes)
      .map((t) => {
        const own = walls.filter((w) => w.typeId === t.id);
        const band = bandAt(t, DEFAULT_CUT_HEIGHT);
        const p = typeProperties(t);
        return {
          mark: t.mark,
          type: t.name,
          thickness: bandThickness(band),
          composition: band.layers
            .map((l) => `${m.materials[l.materialId]?.name ?? '?'} ${fmt(l.thickness)}`)
            .join(' + '),
          function: WALL_FUNCTION_LABELS[p.function],
          loadBearing: p.loadBearing,
          isExternal: p.isExternal,
          fireRating: p.fireRating,
          acousticRating: p.acousticRating,
          length: own.reduce((s, w) => s + wallQuantities(m, w, 0).length, 0),
          count: own.length,
        };
      })
      .filter((r) => !def.filter.onlyUsed || r.count > 0);
  },
};
