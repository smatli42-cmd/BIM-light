// Spárořez ploch povrchů místnosti (prvky stavby 9): každá plocha s typem s formátem (obklad, dlažba,
// sokl) dostane rozložení dlaždic. Posun počátku je uložený v místnosti logicky (základ 14): klíč
// podlaha / strop / stěna:strana, posun vůči bodu zarovnání – změna stěn a otvorů vše přepočítá.
import type { Vec2 } from '../geometry/index.ts';
import type { Model } from '../model/types.ts';
import type { Room } from '../room/types.ts';
import type { CoveringSurface } from './surface-types.ts';
import { roomSurfaces } from './surfaces.ts';
import { tileLayout, type TileLayout } from './tiling.ts';
import type { CoveringType, TileFormat } from './types.ts';

export interface SurfaceTiling {
  readonly surface: CoveringSurface;
  readonly type: CoveringType;
  readonly tile: TileFormat;
  /** Klíč posunu počátku v místnosti (`floor`, `ceiling`, `wallId:strana`); ostění nemá vlastní. */
  readonly originKey: string | null;
  /** Uložený posun vůči bodu zarovnání (mm, u, v). */
  readonly offset: Vec2;
  readonly layout: TileLayout;
}

const ZERO: Vec2 = { x: 0, y: 0 };
const cache = new WeakMap<Model, Map<string, SurfaceTiling[]>>();

/** Klíč posunu počátku spárořezu plochy (základ 14). */
export function tileOriginKey(s: CoveringSurface): string | null {
  if (s.place === 'floor' || s.place === 'ceiling') return s.place;
  if (s.place === 'wall' && s.wallId && s.side) return `${s.wallId}:${s.side}`;
  return null;
}

/** Typ s formátem dlaždic pro plochu, nebo nic. */
export function tiledType(model: Model, s: CoveringSurface): CoveringType | null {
  const t = s.typeId ? model.coveringTypes[s.typeId] : undefined;
  return t?.tile && t.tile.width > 0 && t.tile.height > 0 ? t : null;
}

function compute(model: Model, room: Room): SurfaceTiling[] {
  return roomSurfaces(model, room).flatMap((surface) => {
    const type = tiledType(model, surface);
    if (!type?.tile || !surface.polygons.length) return [];
    const originKey = tileOriginKey(surface);
    const offset = (originKey && room.coverings?.tileOrigins?.[originKey]) || ZERO;
    return [
      {
        surface,
        type,
        tile: type.tile,
        originKey,
        offset,
        layout: tileLayout(surface.polygons, type.tile, offset),
      },
    ];
  });
}

/** Spárořez všech obkládaných ploch místnosti (pamatuje se pro daný model). */
export function roomTiling(model: Model, room: Room): SurfaceTiling[] {
  const m = cache.get(model) ?? new Map<string, SurfaceTiling[]>();
  cache.set(model, m);
  const hit = m.get(room.id);
  if (hit) return hit;
  const out = compute(model, room);
  m.set(room.id, out);
  return out;
}

export interface TileCount {
  readonly typeId: string;
  readonly whole: number;
  readonly cut: number;
  readonly narrow: number;
  /** Plocha obkladu (mm²). */
  readonly area: number;
}

/** Počty dlaždic místnosti po typech (každý odřez = jedna dlaždice, odřezy se znovu nepoužívají). */
export function tileCounts(list: readonly SurfaceTiling[]): TileCount[] {
  const out = new Map<string, { whole: number; cut: number; narrow: number; area: number }>();
  for (const t of list) {
    const c = out.get(t.type.id) ?? { whole: 0, cut: 0, narrow: 0, area: 0 };
    out.set(t.type.id, {
      whole: c.whole + t.layout.whole,
      cut: c.cut + t.layout.cut,
      narrow: c.narrow + t.layout.narrow,
      area: c.area + t.surface.area,
    });
  }
  return [...out].map(([typeId, c]) => ({ typeId, ...c }));
}

/** Celkem dlaždic s prořezem (%), zaokrouhleno nahoru na celé kusy. */
export const withWaste = (pieces: number, wastePercent: number): number =>
  pieces ? Math.ceil(pieces * (1 + wastePercent / 100) - 1e-9) : 0;
