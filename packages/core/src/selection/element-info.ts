// Karta prvku (koncepce rozhraní, část 2 I – informace po podržení myši): souhrn vlastností stěny
// nebo otvoru spočítaný z modelu. Stejná data vidí AI dotazem `element.info` (základy 6, 15).
import { pathLength } from '../geometry/index.ts';
import type { Id } from '../ids/index.ts';
import type { Model } from '../model/types.ts';
import { openingLevels } from '../opening/geometry.ts';
import { layerForCategory } from '../view/effective.ts';
import { wallGeometry } from '../wall/geometry.ts';
import { getWall, wallSection } from '../wall/queries.ts';
import type { Wall } from '../wall/types.ts';
import { wallHeight } from '../wall-height/resolve.ts';

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

export type ElementInfo = WallInfo | OpeningInfo;

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

/** Karta prvku podle id (stěna nebo otvor); neznámé id = null. */
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
  const w = m.elements[id];
  return w ? wallInfo(m, w) : null;
}
