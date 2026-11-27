// Zdroj výkazu „místnosti“ (výpis místností, základ 8, prvky stavby 9): jeden řádek = jedna místnost;
// plocha podle ČSN 73 4301 (2 desetinná místa), obvod, výška a objem. Neuzavřená místnost má plochu 0
// a stav „neuzavřená“ (Revit „Not Enclosed“).
import type { Model } from '../model/types.ts';
import { allRoomGeometry } from '../room/queries.ts';
import type { Room, RoomState } from '../room/types.ts';
import { areaSplit, levelText } from '../room/stamp.ts';
import { num, text, type ScheduleSourceDef } from './fields.ts';
import { STATUS_LABELS, variantLabel } from './source-walls.ts';
import type { ScheduleDef } from './types.ts';

export const ROOM_STATE_LABELS: Readonly<Record<RoomState, string>> = {
  ok: '',
  'not-enclosed': 'neuzavřená',
  'in-wall': 'bod ve stěně',
  redundant: 'nadbytečná',
};

export function filteredRooms(m: Model, def: ScheduleDef): Room[] {
  const f = def.filter;
  return Object.values(m.rooms).filter(
    (r) =>
      (!f.storeyIds.length || f.storeyIds.includes(r.storeyId)) &&
      (!f.statuses.length || f.statuses.includes(r.status)) &&
      (f.variants === 'all' || r.variant.kind === 'main'),
  );
}

export const ROOMS_SOURCE: ScheduleSourceDef = {
  label: 'Místnosti',
  fields: [
    text('number', 'Číslo'),
    text('name', 'Název'),
    text('storey', 'Podlaží'),
    text('status', 'Stav'),
    text('variant', 'Varianta'),
    text('category', 'Kategorie'),
    num('area', 'Plocha', 'm²', 2),
    num('livingArea', 'Plocha obytná', 'm²', 2),
    num('utilityArea', 'Plocha užitková', 'm²', 2),
    num('perimeter', 'Obvod', 'm', 2),
    num('height', 'Světlá výška', 'mm', 0, false),
    text('floorLevel', 'Výška podlahy'),
    num('volume', 'Objem', 'm³', 2),
    text('floorFinish', 'Podlaha'),
    text('wallFinish', 'Stěny'),
    text('ceilingFinish', 'Strop'),
    num('occupants', 'Počet osob', 'os.', 0),
    num('temperature', 'Teplota', '°C', 0, false),
    text('note', 'Poznámka'),
    text('check', 'Kontrola'),
    num('count', 'Počet', 'ks', 0),
  ],
  rows: (m, def) => {
    const geo = allRoomGeometry(m);
    return filteredRooms(m, def).map((r) => {
      const g = geo.get(r.id);
      const ok = g?.state === 'ok';
      const split = areaSplit(m, r, ok ? g.area : 0);
      const p = r.props ?? {};
      const level = (m.storeys[r.storeyId]?.elevation ?? 0) + (r.floorOffset ?? 0);
      return {
        number: r.number,
        name: r.name,
        storey: m.storeys[r.storeyId]?.name ?? '',
        status: STATUS_LABELS[r.status],
        variant: variantLabel(m, r),
        category: m.roomCategories[r.categoryId ?? '']?.name ?? '',
        area: ok ? g.area / 1e6 : 0,
        livingArea: split.living / 1e6,
        utilityArea: split.utility / 1e6,
        perimeter: ok ? g.perimeter / 1000 : 0,
        height: g?.height ?? 0,
        volume: ok ? g.volume / 1e9 : 0,
        floorLevel: levelText(level),
        floorFinish: p.floorFinish ?? '',
        wallFinish: p.wallFinish ?? '',
        ceilingFinish: p.ceilingFinish ?? '',
        occupants: p.occupants ?? 0,
        temperature: p.temperature ?? '',
        note: p.note ?? '',
        check: ROOM_STATE_LABELS[g?.state ?? 'not-enclosed'],
        count: 1,
      };
    });
  },
};
