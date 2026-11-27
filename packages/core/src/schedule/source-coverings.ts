// Zdroj výkazu „povrchy“ (základ 8, prvky stavby 9): řádek = spočítaná plocha s typem úpravy (stěna
// v zóně, ostění, podlaha, strop). Plochy jsou tytéž, které kreslí 3D a rozvinutý pohled (`covering/`).
// Pravidlo výkazu: otvory do `minOpeningArea` m² se neodečítají; ostění podle `jambRule` (výchozí jen
// u odečtených otvorů – běžná rozpočtová praxe). Délka = spodní hrana soklu bez dveří.
import { roomSurfaces } from '../covering/surfaces.ts';
import type { CoveringSurface } from '../covering/surface-types.ts';
import { COVERING_KIND_LABELS } from '../covering/types.ts';
import type { Model } from '../model/types.ts';
import { num, text, type ScheduleSourceDef } from './fields.ts';
import { filteredRooms } from './source-rooms.ts';
import { STATUS_LABELS } from './source-walls.ts';
import type { ScheduleDef, ScheduleRow } from './types.ts';

const PLACE_LABELS: Readonly<Record<CoveringSurface['place'], string>> = {
  wall: 'Stěny',
  jamb: 'Stěny',
  floor: 'Podlaha',
  ceiling: 'Strop',
};

/** Odečítá se otvor podle pravidla výkazu? (plocha celého otvoru nad mezí) */
function deducted(m: Model, def: ScheduleDef, openingId: string): boolean {
  const o = m.openings[openingId];
  return !!o && (o.width * o.height) / 1e6 > def.minOpeningArea + 1e-9;
}

function areas(m: Model, def: ScheduleDef, s: CoveringSurface) {
  if (s.place === 'jamb') {
    const rule = def.jambRule ?? 'deducted';
    const counted = rule === 'all' || (rule === 'deducted' && deducted(m, def, s.openingId ?? ''));
    return counted ? { area: s.area, openingArea: 0, jambArea: s.area } : null;
  }
  const kept = s.openings.filter((o) => !deducted(m, def, o.openingId)).reduce((a, o) => a + o.area, 0);
  const cut = s.openings.reduce((a, o) => a + o.area, 0) - kept;
  return { area: s.area + kept, openingArea: cut, jambArea: 0 };
}

export const COVERINGS_SOURCE: ScheduleSourceDef = {
  label: 'Povrchy místností',
  fields: [
    text('room', 'Místnost'),
    text('roomNumber', 'Číslo'),
    text('roomName', 'Název'),
    text('storey', 'Podlaží'),
    text('status', 'Stav'),
    text('place', 'Povrch'),
    text('type', 'Úprava'),
    text('kind', 'Druh'),
    text('material', 'Materiál'),
    num('area', 'Plocha', 'm²', 2),
    num('openingArea', 'Odečtené otvory', 'm²', 2),
    num('jambArea', 'Ostění', 'm²', 2),
    num('length', 'Délka soklu', 'm', 2),
    num('count', 'Počet ploch', 'ks', 0),
  ],
  rows: (m, def) =>
    filteredRooms(m, def).flatMap((r) =>
      roomSurfaces(m, r).flatMap((s): ScheduleRow[] => {
        const type = s.typeId ? m.coveringTypes[s.typeId] : undefined;
        const a = type && areas(m, def, s);
        if (!type || !a) return [];
        return [
          {
            room: `${r.number} ${r.name}`.trim(),
            roomNumber: r.number,
            roomName: r.name,
            storey: m.storeys[r.storeyId]?.name ?? '',
            status: STATUS_LABELS[r.status],
            place: PLACE_LABELS[s.place],
            type: type.name,
            kind: COVERING_KIND_LABELS[type.kind],
            material: m.materials[type.materialId ?? '']?.name ?? '',
            area: a.area / 1e6,
            openingArea: a.openingArea / 1e6,
            jambArea: a.jambArea / 1e6,
            length: type.kind === 'skirting' && s.place === 'wall' ? s.length / 1000 : 0,
            count: 1,
          },
        ];
      }),
    ),
};
