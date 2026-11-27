// Příkaz room.update (prvky stavby 9): číslo, název, výška, stav, bod uvnitř, razítko, ruční obrys se
// zámkem (základ 16), kategorie, vlastní barva výplně (přepis prvku, patro 5), výška podlahy a zadávané
// údaje (povrchy jako text, poznámka, počet osob, výpočtová teplota). Plocha se zadat nedá – počítá se.
import type { Vec2 } from '../../geometry/index.ts';
import type { Id } from '../../ids/index.ts';
import type { HeightTop } from '../../model/height.ts';
import { STATUSES, type Model, type Status } from '../../model/types.ts';
import { putRooms } from '../../model/update.ts';
import { roomGeometry } from '../../room/geometry.ts';
import { ROOM_NUMBER_PROPS, ROOM_TEXT_PROPS, type Room, type RoomProps } from '../../room/types.ts';
import { S, type JsonSchema } from '../schema.ts';
import { OUTLINE_SCHEMA, validOutline } from '../slab/shared.ts';
import { HEIGHT_SCHEMA } from '../wall/shared.ts';
import { defineCommand, fail } from '../types.ts';
import { checkTop, roomOf } from './room.ts';

const TOP_SCHEMA = HEIGHT_SCHEMA.properties?.['top'] as JsonSchema;
const orNull = (s: JsonSchema): JsonSchema => ({ oneOf: [s, { type: 'null' }] });
const COLOR: JsonSchema = { type: 'string', description: 'barva #rrggbb' };

type PropPatch = { [K in keyof RoomProps]?: RoomProps[K] | null };

export interface RoomUpdateParams extends PropPatch {
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
  categoryId?: Id | null;
  /** Vlastní barva výplně (přepis prvku); null = barva kategorie / pravidla. */
  color?: string | null;
  floorOffset?: number;
}

/** Hodnota pole: nová, null = smazat, undefined = beze změny. */
const pick = <T>(next: T | null | undefined, old: T | undefined): T | undefined =>
  next === undefined ? old : (next ?? undefined);

function patchProps(r: Room, p: RoomUpdateParams): RoomProps | undefined {
  const out: Record<string, string | number> = {};
  for (const k of [...ROOM_TEXT_PROPS, ...ROOM_NUMBER_PROPS]) {
    const v = pick<string | number>(p[k], r.props?.[k]);
    if (v !== undefined && v !== '') out[k] = typeof v === 'string' ? v.trim() : v;
  }
  return Object.keys(out).length ? (out as RoomProps) : undefined;
}

function patchColor(r: Room, color: string | null | undefined): Room['graphicOverride'] {
  if (color === undefined) return r.graphicOverride;
  if (color !== null && !/^#[0-9a-fA-F]{6}$/.test(color)) fail('invalid', 'Barva musí být #rrggbb');
  const { fillColor: _f, ...rest } = r.graphicOverride ?? {};
  const g = color ? { ...rest, fillColor: color } : rest;
  return Object.keys(g).length ? g : undefined;
}

/** Nepovinná pole: undefined se do dat nezapisuje (čistý JSON). */
type Loose<T> = { [K in keyof T]?: T[K] | undefined };
const clean = (r: Loose<Room>): Room =>
  Object.fromEntries(Object.entries(r).filter(([, v]) => v !== undefined)) as unknown as Room;

function updated(model: Model, r: Room, p: RoomUpdateParams): Room {
  if (p.number !== undefined && !p.number.trim()) fail('invalid', 'Číslo místnosti nesmí být prázdné');
  if (p.categoryId && !model.roomCategories[p.categoryId]) fail('not-found', 'Kategorie neexistuje');
  if (p.top) checkTop(model, r.storeyId, p.top);
  const manual = pick(p.manualOutline, r.manualOutline as Vec2[] | undefined);
  return clean({
    ...r,
    number: p.number?.trim() ?? r.number,
    name: p.name ?? r.name,
    top: p.top ?? r.top,
    status: p.status ?? r.status,
    seed: p.point ?? r.seed,
    stampAt: pick(p.stampAt, r.stampAt),
    manualOutline: manual && (p.manualOutline ? validOutline(manual) : manual),
    categoryId: pick(p.categoryId, r.categoryId),
    floorOffset: p.floorOffset === undefined ? r.floorOffset : p.floorOffset || undefined,
    props: patchProps(r, p),
    graphicOverride: patchColor(r, p.color),
  });
}

export const roomUpdate = defineCommand<RoomUpdateParams>({
  name: 'room.update',
  label: 'Upravit místnost',
  description:
    'Změní místnost: number, name, top (vršek), status, point (bod uvnitř), stampAt (poloha razítka, null ' +
    '= do bodu uvnitř), manualOutline (zamčený ruční obrys; null = zpět na výpočet ze stěn), categoryId ' +
    '(kategorie / funkce z roomCategory.list; null = bez), color (vlastní barva výplně #rrggbb; null = ' +
    'barva kategorie), floorOffset (výška podlahy nad podlažím, mm), floorFinish / wallFinish / ' +
    'ceilingFinish (povrchy jako text), note, occupants (počet osob), temperature (výpočtová teplota °C). ' +
    'null u textu nebo čísla údaj smaže. Plocha se zadat nedá – vždy se počítá ze stěn.',
  group: 'Místnost',
  params: S.object(
    {
      roomId: S.id,
      number: { type: 'string' },
      name: { type: 'string' },
      top: TOP_SCHEMA,
      status: S.enumOf(STATUSES, 'stav: stávající / bourání / nový'),
      point: S.point,
      stampAt: orNull(S.point),
      manualOutline: orNull(OUTLINE_SCHEMA),
      categoryId: orNull(S.id),
      color: orNull(COLOR),
      floorOffset: S.number('výška podlahy nad úrovní podlaží (mm)'),
      ...Object.fromEntries(ROOM_TEXT_PROPS.map((k) => [k, orNull({ type: 'string' })])),
      occupants: orNull({ type: 'integer', minimum: 0, description: 'počet osob' }),
      temperature: orNull(S.number('výpočtová vnitřní teplota (°C)')),
    },
    ['roomId'],
  ),
  run(model, p) {
    const next = updated(model, roomOf(model, p.roomId), p);
    if (p.point && roomGeometry(model, next).state === 'in-wall') fail('invalid', 'Bod leží ve stěně');
    return { model: putRooms(model, [next]) };
  },
});
