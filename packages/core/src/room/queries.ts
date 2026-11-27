// Dotazy nad místnostmi (bez změn dat): seznam, spočítaná geometrie s kontrolou „nadbytečná“
// (dvě místnosti téhož stavu a varianty ve stejném uzavřeném prostoru – platí první, Revit „Redundant Room“).
import type { Id } from '../ids/index.ts';
import type { Model } from '../model/types.ts';
import { pointInPolygon } from '../selection/pick.ts';
import { roomGeometry, type RoomGeometry } from './geometry.ts';
import type { Room } from './types.ts';

export const allRooms = (model: Model): Room[] => Object.values(model.rooms);

export const findRoom = (model: Model, id: Id | null | undefined): Room | undefined =>
  id ? model.rooms[id] : undefined;

const sameGroup = (a: Room, b: Room) =>
  a.storeyId === b.storeyId &&
  a.status === b.status &&
  JSON.stringify(a.variant) === JSON.stringify(b.variant);

const covers = (g: RoomGeometry | undefined, r: Room) =>
  !!g &&
  g.outline.length > 0 &&
  pointInPolygon(r.seed, g.outline) &&
  !g.holes.some((h) => pointInPolygon(r.seed, h));

/** Geometrie všech místností (případně jen podlaží) s označením nadbytečných. */
export function allRoomGeometry(model: Model, storeyId?: Id): Map<Id, RoomGeometry> {
  const rooms = allRooms(model).filter((r) => storeyId === undefined || r.storeyId === storeyId);
  const out = new Map<Id, RoomGeometry>();
  rooms.forEach((r, i) => {
    const g = roomGeometry(model, r);
    const twin = rooms
      .slice(0, i)
      .find((o) => sameGroup(o, r) && !r.manualOutline && covers(out.get(o.id), r));
    out.set(r.id, twin && g.state === 'ok' ? { ...g, state: 'redundant' } : g);
  });
  return out;
}

/** Geometrie jedné místnosti včetně kontroly „nadbytečná“. */
export const roomInfo = (model: Model, r: Room): RoomGeometry =>
  allRoomGeometry(model, r.storeyId).get(r.id) ?? roomGeometry(model, r);

/** Plocha v m² zaokrouhlená podle ČSN 73 4301 (2 desetinná místa, volitelně 1). */
export const areaM2 = (mm2: number, decimals = 2): number => {
  const k = 10 ** decimals;
  return Math.round((mm2 / 1e6) * k) / k;
};

/** Plocha jako text „12,34 m²“ (české desetinné místo). */
export const areaText = (mm2: number, decimals = 2): string =>
  `${areaM2(mm2, decimals).toFixed(decimals).replace('.', ',')} m²`;

/** Další volné číslo místnosti: „1.01“ v 1.NP (úroveň ±0), „2.01“ ve 2.NP, „0.01“ v 1.PP. */
export function nextRoomNumber(model: Model, storeyId: Id): string {
  const storeys = Object.values(model.storeys).sort((a, b) => a.elevation - b.elevation);
  const ground = Math.max(
    0,
    storeys.findIndex((s) => s.elevation >= -1),
  );
  const prefix = String(storeys.findIndex((s) => s.id === storeyId) - ground + 1);
  const used = new Set(allRooms(model).map((r) => r.number));
  for (let i = 1; ; i++) {
    const n = `${prefix}.${String(i).padStart(2, '0')}`;
    if (!used.has(n)) return n;
  }
}
