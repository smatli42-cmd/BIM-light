// Karta prvku (koncepce rozhraní, část 2 I – informace po podržení myši): souhrn vlastností stěny,
// otvoru nebo desky spočítaný z modelu. Stejná data vidí AI dotazem `element.info` (základy 6, 15).
import { roofGeometry } from '../roof/planes.ts';
import { findRoof } from '../roof/queries.ts';
import type { Roof } from '../roof/types.ts';
import { findWall } from '../wall/queries.ts';
import { pathLength } from '../geometry/index.ts';
import type { Id } from '../ids/index.ts';
import type { Model } from '../model/types.ts';
import { openingLevels } from '../opening/geometry.ts';
import { layerForCategory } from '../view/effective.ts';
import { wallGeometry } from '../wall/geometry.ts';
import { getWall, wallSection } from '../wall/queries.ts';
import type { Wall } from '../wall/types.ts';
import { slabArea, slabLevels, slabPerimeter } from '../slab/geometry.ts';
import { findSlab } from '../slab/queries.ts';
import type { Slab, SlabFunction } from '../slab/types.ts';
import { wallHeight } from '../wall-height/resolve.ts';
import { roomInfo } from '../room/queries.ts';
import type { RoomState } from '../room/types.ts';

const r1 = (v: number) => Math.round(v * 10) / 10;
/** m² na dvě desetinná místa. */
const m2 = (mm2: number) => Math.round(mm2 / 1e4) / 100;

export interface WallInfo {
  readonly kind: 'wall';
  readonly id: Id;
  readonly storeyName: string;
  readonly typeName: string;
  /** Délka referenčního líce (mm). */
  readonly length: number;
  readonly thickness: number;
  readonly height: number;
  /** Plocha boku = délka × výška (m²) a čistá plocha bez průchozích otvorů. */
  readonly sideArea: number;
  readonly sideAreaNet: number;
  readonly openings: number;
  readonly layerName: string;
}

export interface OpeningInfo {
  readonly kind: 'opening';
  readonly id: Id;
  readonly storeyName: string;
  readonly openingKind: 'through' | 'niche';
  readonly width: number;
  readonly height: number;
  readonly sill: number;
  /** Spodní hrana nad ±0,000 (mm). */
  readonly bottom: number;
  readonly hostTypeName: string;
  readonly layerName: string;
}

/** Deska (D2): typ, funkce, výšky líců nad ±0,000, plocha a obvod. */
export interface SlabInfo {
  readonly kind: 'slab';
  readonly id: Id;
  readonly storeyName: string;
  readonly typeName: string;
  readonly mark: string;
  readonly slabFunction: SlabFunction;
  readonly top: number;
  readonly bottom: number;
  readonly thickness: number;
  /** m² a m na dvě desetinná místa. */
  readonly area: number;
  readonly perimeter: number;
  readonly layerName: string;
}

/** Místnost (prvky stavby 9): číslo, název, plocha podle ČSN 73 4301, obvod, výška, objem, stav výpočtu. */
export interface RoomCardInfo {
  readonly kind: 'room';
  readonly id: Id;
  readonly storeyName: string;
  readonly number: string;
  readonly name: string;
  /** m² (2 desetinná místa), obvod v m, výška v mm, objem v m³. */
  readonly area: number;
  readonly perimeter: number;
  readonly height: number;
  readonly volume: number;
  readonly state: RoomState;
  readonly layerName: string;
}

/** Střecha (rozhodnutí 11): typ, ref. čára, okap a hřeben (absolutně), roviny a plocha. */
export interface RoofInfo {
  readonly kind: 'roof';
  readonly id: Id;
  readonly storeyName: string;
  readonly typeName: string;
  readonly mark: string;
  readonly refLevel: number;
  readonly eaveLevel: number;
  readonly ridgeLevel: number;
  readonly planes: number;
  /** m² v rovině střechy. */
  readonly area: number;
  readonly layerName: string;
}

export type ElementInfo = WallInfo | OpeningInfo | SlabInfo | RoomCardInfo | RoofInfo;

function roomCard(m: Model, id: Id): RoomCardInfo | null {
  const r = m.rooms[id];
  if (!r) return null;
  const g = roomInfo(m, r);
  return {
    kind: 'room',
    id,
    storeyName: m.storeys[r.storeyId]?.name ?? '',
    number: r.number,
    name: r.name,
    area: m2(g.area),
    perimeter: Math.round(g.perimeter / 10) / 100,
    height: r1(g.height),
    volume: Math.round(g.volume / 1e6) / 1000,
    state: g.state,
    layerName: layerForCategory(m.display, 'room')?.name ?? '',
  };
}

function roofInfo(m: Model, r: Roof): RoofInfo {
  const t = m.roofTypes[r.typeId];
  const g = roofGeometry(m, r);
  const zs = g.planes.flatMap((p) => p.polygon.map((q) => q.z));
  return {
    kind: 'roof',
    id: r.id,
    storeyName: m.storeys[r.storeyId]?.name ?? '',
    typeName: t?.name ?? '',
    mark: t?.mark ?? '',
    refLevel: r1(g.refZ),
    eaveLevel: r1(Math.min(g.refZ, ...g.planes.map((p) => p.eaveZ))),
    ridgeLevel: r1(Math.max(g.refZ, ...zs)),
    planes: g.planes.length,
    area: m2(g.planes.reduce((a, p) => a + p.area, 0)),
    layerName: layerForCategory(m.display, 'roof')?.name ?? '',
  };
}

function slabInfo(m: Model, s: Slab): SlabInfo {
  const t = m.slabTypes[s.typeId];
  const lv = slabLevels(m, s);
  return {
    kind: 'slab',
    id: s.id,
    storeyName: m.storeys[s.storeyId]?.name ?? '',
    typeName: t?.name ?? '',
    mark: t?.mark ?? '',
    slabFunction: s.slabFunction,
    top: r1(lv.top),
    bottom: r1(lv.bottom),
    thickness: r1(lv.thickness),
    area: m2(slabArea(s)),
    perimeter: Math.round(slabPerimeter(s) / 10) / 100,
    layerName: layerForCategory(m.display, 'slab')?.name ?? '',
  };
}

function wallInfo(m: Model, w: Wall): WallInfo {
  const length = r1(pathLength(wallGeometry(m, w).faces.ref));
  const height = r1(wallHeight(m, w).height);
  const holes = Object.values(m.openings).filter((o) => o.hostId === w.id && o.kind === 'through');
  const holeArea = holes.reduce((sum, o) => sum + o.width * o.height, 0);
  return {
    kind: 'wall',
    id: w.id,
    storeyName: m.storeys[w.storeyId]?.name ?? '',
    typeName: m.wallTypes[w.typeId]?.name ?? '',
    length,
    thickness: wallSection(m, w).thickness,
    height,
    sideArea: m2(length * height),
    sideAreaNet: m2(Math.max(0, length * height - holeArea)),
    openings: holes.length,
    layerName: layerForCategory(m.display, 'wall')?.name ?? '',
  };
}

/** Karta prvku podle id (stěna, otvor nebo deska); neznámé id = null. */
export function elementInfo(m: Model, id: Id): ElementInfo | null {
  const o = m.openings[id];
  if (o) {
    const host = getWall(m, o.hostId);
    return {
      kind: 'opening',
      id,
      storeyName: m.storeys[o.storeyId]?.name ?? '',
      openingKind: o.kind,
      width: o.width,
      height: o.height,
      sill: o.sill,
      bottom: r1(openingLevels(m, o, host).bottom),
      hostTypeName: m.wallTypes[host.typeId]?.name ?? '',
      layerName: layerForCategory(m.display, 'opening')?.name ?? '',
    };
  }
  const w = findWall(m, id);
  if (w) return wallInfo(m, w);
  const s = findSlab(m, id);
  if (s) return slabInfo(m, s);
  const roof = findRoof(m, id);
  return roof ? roofInfo(m, roof) : roomCard(m, id);
}
