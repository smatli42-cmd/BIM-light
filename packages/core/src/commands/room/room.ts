// Příkazy místnosti (prvky stavby 9; Revit Room, Archicad Zone): vložení klikem dovnitř (bod uvnitř),
// úprava čísla, názvu, výšky, polohy razítka a ručního obrysu se zámkem (základ 16), smazání.
// Obrys, plocha a objem se nikdy nezadávají – počítají se ze stěn (základ 4).
import type { Vec2 } from '../../geometry/index.ts';
import type { Id } from '../../ids/index.ts';
import { heightError, type HeightTop } from '../../model/height.ts';
import { STATUSES, type Model, type Status } from '../../model/types.ts';
import { putRooms, removeRooms } from '../../model/update.ts';
import { roomGeometry } from '../../room/geometry.ts';
import { nextRoomNumber } from '../../room/queries.ts';
import { DEFAULT_ROOM_TOP, type Room } from '../../room/types.ts';
import { storeyOf } from '../lookup.ts';
import { S, type JsonSchema } from '../schema.ts';
import { OUTLINE_SCHEMA, validOutline } from '../slab/shared.ts';
import { HEIGHT_SCHEMA } from '../wall/shared.ts';
import { defineCommand, fail } from '../types.ts';

const TOP_SCHEMA = HEIGHT_SCHEMA.properties?.['top'] as JsonSchema;
const IDS = { type: 'array', items: S.id, minItems: 1 } as JsonSchema;

export const roomOf = (m: Model, id: Id): Room =>
  m.rooms[id] ?? fail('not-found', `Místnost ${id} neexistuje`);

function checkTop(model: Model, storeyId: Id, top: HeightTop) {
  const err = heightError(model, { baseStoreyId: storeyId, baseOffset: 0, top });
  if (err) fail('invalid', err);
}

export interface RoomCreateParams {
  storeyId: Id;
  point: Vec2;
  number?: string;
  name?: string;
  top?: HeightTop;
  status?: Status;
}

export const roomCreate = defineCommand<RoomCreateParams>({
  name: 'room.create',
  label: 'Místnost',
  description:
    'Vloží místnost klikem dovnitř: point = bod uvnitř prostoru ohraničeného stěnami (mm). Obrys se ' +
    'najde mezi vnitřními líci stěn (ČSN 73 4301) a přepočítá se při každé změně stěn. number (výchozí ' +
    'další volné, např. 1.03), name (výchozí „Místnost“), top = vršek (výchozí podlaží nad). Bod ve ' +
    'stěně se odmítne; neuzavřený prostor se přijme s varováním (room.list → state).',
  group: 'Místnost',
  icon: 'room',
  shortcut: 'N',
  params: S.object(
    {
      storeyId: S.id,
      point: S.point,
      number: { type: 'string' },
      name: { type: 'string' },
      top: TOP_SCHEMA,
      status: S.enumOf(STATUSES, 'stav: stávající / bourání / nový'),
    },
    ['storeyId', 'point'],
  ),
  run(model, p, ctx) {
    const storey = storeyOf(model, p.storeyId);
    const top = p.top ?? DEFAULT_ROOM_TOP;
    checkTop(model, storey.id, top);
    const room: Room = {
      id: ctx.newId(),
      ifcClass: 'IfcSpace',
      category: 'room',
      discipline: 'architecture',
      status: p.status ?? 'new',
      variant: ctx.variant,
      storeyId: storey.id,
      number: p.number ?? nextRoomNumber(model, storey.id),
      name: p.name ?? 'Místnost',
      seed: p.point,
      top,
    };
    if (roomGeometry(model, room).state === 'in-wall')
      fail('invalid', 'Bod leží ve stěně – klikněte do místnosti');
    return { model: putRooms(model, [room]), created: [room.id] };
  },
});

export interface RoomUpdateParams {
  roomId: Id;
  number?: string;
  name?: string;
  top?: HeightTop;
  status?: Status;
  /** Nový bod uvnitř (místnost „přeskočí“ do jiného prostoru). */
  point?: Vec2;
  /** Poloha razítka; null = zpět do bodu uvnitř. */
  stampAt?: Vec2 | null;
  /** Ruční obrys (zamčený, základ 16); null = zpět na výpočet ze stěn. */
  manualOutline?: Vec2[] | null;
}

export const roomUpdate = defineCommand<RoomUpdateParams>({
  name: 'room.update',
  label: 'Upravit místnost',
  description:
    'Změní číslo, název, vršek (top), stav, bod uvnitř (point), polohu razítka (stampAt, null = do bodu ' +
    'uvnitř) nebo ruční obrys (manualOutline = zamčený obrys, který se nepřepočítá ze stěn; null = zpět ' +
    'na výpočet). Plocha se zadat nedá – vždy se počítá.',
  group: 'Místnost',
  params: S.object(
    {
      roomId: S.id,
      number: { type: 'string' },
      name: { type: 'string' },
      top: TOP_SCHEMA,
      status: S.enumOf(STATUSES, 'stav: stávající / bourání / nový'),
      point: S.point,
      stampAt: { oneOf: [S.point, { type: 'null' }] },
      manualOutline: { oneOf: [OUTLINE_SCHEMA, { type: 'null' }] },
    },
    ['roomId'],
  ),
  run(model, p) {
    const r = roomOf(model, p.roomId);
    if (p.number !== undefined && !p.number.trim()) fail('invalid', 'Číslo místnosti nesmí být prázdné');
    if (p.top) checkTop(model, r.storeyId, p.top);
    const { stampAt: _s, manualOutline: _o, ...rest } = r;
    const next: Room = {
      ...rest,
      ...(p.number !== undefined && { number: p.number.trim() }),
      ...(p.name !== undefined && { name: p.name }),
      ...(p.top && { top: p.top }),
      ...(p.status && { status: p.status }),
      ...(p.point && { seed: p.point }),
      ...((p.stampAt === undefined ? r.stampAt : p.stampAt) && { stampAt: (p.stampAt ?? r.stampAt) as Vec2 }),
      ...((p.manualOutline === undefined ? r.manualOutline : p.manualOutline) && {
        manualOutline: p.manualOutline ? validOutline(p.manualOutline) : (r.manualOutline as Vec2[]),
      }),
    };
    if (p.point && roomGeometry(model, next).state === 'in-wall') fail('invalid', 'Bod leží ve stěně');
    return { model: putRooms(model, [next]) };
  },
});

export const roomDelete = defineCommand<{ roomIds: Id[] }>({
  name: 'room.delete',
  label: 'Smazat místnost',
  description: 'Smaže místnosti podle id (stěny, desky i otvory zůstanou beze změny).',
  group: 'Místnost',
  params: S.object({ roomIds: IDS }, ['roomIds']),
  run(model, p) {
    p.roomIds.forEach((id) => roomOf(model, id));
    return { model: removeRooms(model, p.roomIds) };
  },
});
