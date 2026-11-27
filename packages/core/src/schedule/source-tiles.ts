// Zdroj výkazu „dlaždice“ (základ 8, prvky stavby 9 – spárořez): řádek = místnost × typ obkladu / dlažby
// s počtem celých a řezaných dlaždic (každý odřez = jedna dlaždice) a celkem s prořezem (`wastePercent`
// výkazu, výchozí 10 %, nahoru na celé kusy za místnost a typ). Spárořez je týž jako v kresbě a ve 3D.
import { roomTiling, tileCounts, withWaste } from '../covering/tiles.ts';
import { COVERING_KIND_LABELS } from '../covering/types.ts';
import type { Model } from '../model/types.ts';
import { num, text, type ScheduleSourceDef } from './fields.ts';
import { filteredRooms } from './source-rooms.ts';
import { STATUS_LABELS } from './source-walls.ts';
import type { ScheduleDef, ScheduleRow } from './types.ts';

/** Výchozí prořez (%), když ho výkaz nemá nastavený. */
export const DEFAULT_WASTE = 10;

const format = (m: Model, typeId: string) => {
  const t = m.coveringTypes[typeId]?.tile;
  return t ? `${t.width}×${t.height}` : '';
};

function rows(m: Model, def: ScheduleDef): ScheduleRow[] {
  const waste = def.wastePercent ?? DEFAULT_WASTE;
  return filteredRooms(m, def).flatMap((r) =>
    tileCounts(roomTiling(m, r)).map((c) => {
      const type = m.coveringTypes[c.typeId];
      return {
        room: `${r.number} ${r.name}`.trim(),
        roomNumber: r.number,
        roomName: r.name,
        storey: m.storeys[r.storeyId]?.name ?? '',
        status: STATUS_LABELS[r.status],
        type: type?.name ?? '',
        kind: type ? COVERING_KIND_LABELS[type.kind] : '',
        format: format(m, c.typeId),
        area: c.area / 1e6,
        whole: c.whole,
        cut: c.cut,
        narrow: c.narrow,
        total: c.whole + c.cut,
        totalWithWaste: withWaste(c.whole + c.cut, waste),
      };
    }),
  );
}

export const TILES_SOURCE: ScheduleSourceDef = {
  label: 'Dlaždice (spárořez)',
  fields: [
    text('room', 'Místnost'),
    text('roomNumber', 'Číslo'),
    text('roomName', 'Název'),
    text('storey', 'Podlaží'),
    text('status', 'Stav'),
    text('type', 'Úprava'),
    text('kind', 'Druh'),
    text('format', 'Formát'),
    num('area', 'Plocha', 'm²', 2),
    num('whole', 'Celé', 'ks', 0),
    num('cut', 'Řezané', 'ks', 0),
    num('narrow', 'Úzké řezy', 'ks', 0),
    num('total', 'Celkem', 'ks', 0),
    num('totalWithWaste', 'Celkem s prořezem', 'ks', 0),
  ],
  rows,
};
