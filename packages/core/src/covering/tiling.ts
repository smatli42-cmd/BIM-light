// Spárořez plochy povrchu (prvky stavby 9): mřížka formátu a spáry v rovině plochy (u, v) od počátku podle
// zarovnání (od rohu / na střed / na osu spáry) + uložený posun, oříznutá na obrys plochy minus otvory.
// Výsledek: celé kusy, odřezy s rozměry, upozornění na úzké řezy a spáry jako úsečky (osy spár).
import type { Vec2 } from '../geometry/index.ts';
import { clipSegment, type Segment } from './clip-line.ts';
import { clipRect, polygonsArea, rect, type PlanePolygon } from './polygon.ts';
import type { TileFormat } from './types.ts';

export interface TilePiece {
  /** Sloupec a řada v mřížce (0, 0 = dlaždice v počátku). */
  readonly col: number;
  readonly row: number;
  readonly polygons: readonly PlanePolygon[];
  /** Plocha kusu (mm²). */
  readonly area: number;
  /** Rozměr kusu (obálka, mm) ve směru u a v. */
  readonly width: number;
  readonly height: number;
  readonly whole: boolean;
  /** Řez užší než mez (`narrowLimit`). */
  readonly narrow: boolean;
}

export interface TileLayout {
  /** Bod zarovnání (roh obálky plochy, nebo její střed) a skutečný počátek mřížky = bod + posun. */
  readonly anchor: Vec2;
  readonly origin: Vec2;
  readonly pieces: readonly TilePiece[];
  /** Osy spár uvnitř plochy (u, v). */
  readonly joints: readonly Segment[];
  readonly whole: number;
  readonly cut: number;
  readonly narrow: number;
}

/**
 * Mez úzkého řezu ve směru s rozměrem dlaždice `size` (mm): třetina formátu, aspoň 50 mm, ale nejvýš
 * polovina formátu (mozaika). Praxe obkladačů: řez pod třetinu dlaždice se láme a vypadá jako chyba.
 */
export const narrowLimit = (size: number): number => Math.min(size / 2, Math.max(50, size / 3));

/** Obálka mnohoúhelníků plochy. */
export function bounds(polys: readonly PlanePolygon[]) {
  const pts = polys.flatMap((p) => p.outer);
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  return { u0: Math.min(...xs), v0: Math.min(...ys), u1: Math.max(...xs), v1: Math.max(...ys) };
}

/**
 * Bod zarovnání: od rohu = levý dolní roh obálky (roh dlaždice), na střed = střed obálky (střed dlaždice),
 * na osu = střed obálky (osa spáry). Počátek mřížky je vždy levý dolní roh dlaždice (0, 0).
 */
export function gridOrigin(polys: readonly PlanePolygon[], tile: TileFormat, offset: Vec2) {
  const b = bounds(polys);
  const corner = tile.align === 'corner';
  const anchor = corner ? { x: b.u0, y: b.v0 } : { x: (b.u0 + b.u1) / 2, y: (b.v0 + b.v1) / 2 };
  const shift =
    tile.align === 'center'
      ? { x: -tile.width / 2, y: -tile.height / 2 }
      : tile.align === 'axis'
        ? { x: tile.joint / 2, y: tile.joint / 2 }
        : { x: 0, y: 0 };
  const origin = { x: anchor.x + offset.x, y: anchor.y + offset.y };
  return { anchor, origin, corner: { x: origin.x + shift.x, y: origin.y + shift.y }, b };
}

/** Rozsah indexů mřížky, které zasahují do intervalu [a0, a1]. */
const range = (a0: number, a1: number, start: number, pitch: number) => ({
  from: Math.floor((a0 - start) / pitch) - 1,
  to: Math.ceil((a1 - start) / pitch) + 1,
});

function piece(polys: readonly PlanePolygon[], tile: TileFormat, col: number, row: number, r: Vec2[]) {
  const cut = clipRect(polys, r);
  if (!cut.length) return null;
  const area = polygonsArea(cut);
  const b = bounds(cut);
  const width = b.u1 - b.u0;
  const height = b.v1 - b.v0;
  if (width < 1 || height < 1) return null;
  const whole = area >= tile.width * tile.height - 1;
  const narrowU = width < tile.width - 0.5 && width < narrowLimit(tile.width);
  const narrowV = height < tile.height - 0.5 && height < narrowLimit(tile.height);
  return { col, row, polygons: cut, area, width, height, whole, narrow: !whole && (narrowU || narrowV) };
}

/** Spárořez plochy: kusy (celé / odřezy) a spáry. */
export function tileLayout(polys: readonly PlanePolygon[], tile: TileFormat, offset: Vec2): TileLayout {
  const g = gridOrigin(polys, tile, offset);
  const pu = tile.width + tile.joint;
  const pv = tile.height + tile.joint;
  const cols = range(g.b.u0, g.b.u1, g.corner.x, pu);
  const rows = range(g.b.v0, g.b.v1, g.corner.y, pv);
  const pieces: TilePiece[] = [];
  for (let row = rows.from; row <= rows.to; row++) {
    for (let col = cols.from; col <= cols.to; col++) {
      const u = g.corner.x + col * pu;
      const v = g.corner.y + row * pv;
      if (u > g.b.u1 || v > g.b.v1 || u + tile.width < g.b.u0 || v + tile.height < g.b.v0) continue;
      const p = piece(polys, tile, col, row, rect(u, v, u + tile.width, v + tile.height));
      if (p) pieces.push(p);
    }
  }
  const joints: Segment[] = [];
  const half = tile.joint / 2;
  for (let col = cols.from; col <= cols.to; col++) {
    const u = g.corner.x + col * pu - half;
    if (u > g.b.u0 && u < g.b.u1)
      joints.push(...clipSegment(polys, { x: u, y: g.b.v0 }, { x: u, y: g.b.v1 }));
  }
  for (let row = rows.from; row <= rows.to; row++) {
    const v = g.corner.y + row * pv - half;
    if (v > g.b.v0 && v < g.b.v1)
      joints.push(...clipSegment(polys, { x: g.b.u0, y: v }, { x: g.b.u1, y: v }));
  }
  const whole = pieces.filter((p) => p.whole).length;
  return {
    anchor: g.anchor,
    origin: g.origin,
    pieces,
    joints,
    whole,
    cut: pieces.length - whole,
    narrow: pieces.filter((p) => p.narrow).length,
  };
}
