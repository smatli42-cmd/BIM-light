// Povrchy místností ve 3D (prvky stavby 9): spočítané plochy z jádra (`allSurfaces`, stejný zdroj jako
// výkaz a rozvinutý pohled) jako tenké plochy 1 mm před lícem, v barvě a průhlednosti z funkce grafiky
// (`surfaceLook`, kategorie covering). Plocha bez úpravy se nekreslí (zůstane materiál stěny / desky).
// Rovinná plocha se rozloží na trojúhelníky přímo, válcová (líc oblouku) po pruzích mřížky úhlů jádra.
// Plochy se kreslí s polygon offsetem dopředu, aby na dálku vyhrály nad lícem (1 mm na to nestačí). Jen čtení jádra, mm.
import { ShapeUtils, Vector2 } from 'three';
import {
  allSurfaces,
  categoryState,
  clipRect,
  gridCount,
  surfaceLook,
  surfaceNormal,
  surfacePoint,
  type CoveringSurface,
  type CylinderFrame,
  type GraphicView,
  type Id,
  type Model,
  type PlanePolygon,
  type Vec2,
} from '@bim-light/core';

/** Odsazení plochy před líc (mm), aby neblikala se stěnou. */
export const SHEET_OFFSET = 1;

export interface Sheet {
  readonly id: string;
  readonly roomId: Id;
  readonly color: string;
  readonly opacity: number;
  /** Trojúhelníky [x, y, z, …] v mm, natočené lícem do místnosti. */
  readonly positions: readonly number[];
}

export interface SheetFilter {
  /** Zobrazené stěny (skrytá stěna = bez povrchů na ní). */
  readonly walls: ReadonlySet<Id>;
  /** Jen tato podlaží; null = všechna. */
  readonly storeys: ReadonlySet<Id> | null;
  /** Jen výběr (F4): jen povrchy vybraných stěn; null = vše. */
  readonly only: ReadonlySet<Id> | null;
}

/**
 * Hranice pruhů válcové plochy (u, mm): úhly společné mřížky jádra (`gridCount`, jako tělesa stěn), takže
 * tětivy povrchu leží rovnoběžně s tětivami líce stěny a nestřídají se před ním a za ním.
 */
export function stripCuts(f: CylinderFrame, u0: number, u1: number): number[] {
  const n = gridCount(f.radius);
  const k = (u: number) => ((f.angle0 + (f.dir * u) / f.radius) / (2 * Math.PI)) * n;
  const [ka, kb] = [k(u0), k(u1)].sort((x, y) => x - y) as [number, number];
  const cuts: number[] = [];
  for (let i = Math.floor(ka) + 1; i < kb; i++)
    cuts.push((((2 * Math.PI * i) / n - f.angle0) * f.radius) / f.dir);
  return [u0, ...cuts.filter((u) => u > u0 + 0.01 && u < u1 - 0.01).sort((x, y) => x - y), u1];
}

/** Válcová plocha po pruzích mezi úhly mřížky (rovinná beze změny). */
function strips(s: CoveringSurface): PlanePolygon[] {
  if (s.frame.kind === 'plane') return [...s.polygons];
  const us = s.polygons.flatMap((p) => p.outer.map((q) => q.x));
  const vs = s.polygons.flatMap((p) => p.outer.map((q) => q.y));
  const [u0, u1, v0, v1] = [Math.min(...us), Math.max(...us), Math.min(...vs) - 1, Math.max(...vs) + 1];
  const cuts = stripCuts(s.frame, u0, u1);
  const out: PlanePolygon[] = [];
  for (let i = 0; i + 1 < cuts.length; i++) {
    const [a, b] = [cuts[i] as number, cuts[i + 1] as number];
    const r = [
      { x: a, y: v0 },
      { x: b, y: v0 },
      { x: b, y: v1 },
      { x: a, y: v1 },
    ];
    out.push(...clipRect(s.polygons, r));
  }
  return out;
}

/** Trojúhelníky plochy ve 3D, odsazené po normále a natočené lícem do místnosti. */
export function sheetTriangles(s: CoveringSurface): number[] {
  const out: number[] = [];
  const at = (p: Vec2) => {
    const q = surfacePoint(s.frame, p);
    const n = surfaceNormal(s.frame, p);
    return [q.x + n.x * SHEET_OFFSET, q.y + n.y * SHEET_OFFSET, q.z + n.z * SHEET_OFFSET];
  };
  for (const poly of strips(s)) {
    const pts = [poly.outer, ...poly.holes].flat();
    const v2 = (r: readonly Vec2[]) => r.map((p) => new Vector2(p.x, p.y));
    const faces = ShapeUtils.triangulateShape(v2(poly.outer), poly.holes.map(v2));
    for (const f of faces) {
      const [a, b, c] = f.map((i) => pts[i] as Vec2) as [Vec2, Vec2, Vec2];
      const mid = { x: (a.x + b.x + c.x) / 3, y: (a.y + b.y + c.y) / 3 };
      const [pa, pb, pc] = [at(a), at(b), at(c)] as [number[], number[], number[]];
      const n = surfaceNormal(s.frame, mid);
      const e1 = pb.map((v, i) => v - (pa[i] as number));
      const e2 = pc.map((v, i) => v - (pa[i] as number));
      const [x1, y1, z1] = e1 as [number, number, number];
      const [x2, y2, z2] = e2 as [number, number, number];
      const dot = (y1 * z2 - z1 * y2) * n.x + (z1 * x2 - x1 * z2) * n.y + (x1 * y2 - y1 * x2) * n.z;
      out.push(...pa, ...(dot >= 0 ? [...pb, ...pc] : [...pc, ...pb]));
    }
  }
  return out;
}

function wanted(s: CoveringSurface, f: SheetFilter): boolean {
  if (f.storeys && !f.storeys.has(s.storeyId)) return false;
  if (s.wallId === undefined) return !f.only;
  return f.walls.has(s.wallId) && (!f.only || f.only.has(s.wallId));
}

/** Povrchy s úpravou pro 3D pohled `view` (vrstva, filtr rekonstrukce, pravidla přes funkci grafiky). */
export function surfaceSheets(model: Model, view: GraphicView, f: SheetFilter): Sheet[] {
  if (!categoryState(model.display, view, 'covering').visible) return [];
  return allSurfaces(model).flatMap((s) => {
    const room = model.rooms[s.roomId];
    if (!s.typeId || !room || room.variant.kind !== 'main' || !wanted(s, f)) return [];
    const look = surfaceLook(model, room, s.typeId, view);
    if (!look.visible || !look.color) return [];
    const positions = sheetTriangles(s);
    if (!positions.length) return [];
    const opacity = 1 - Math.min(100, Math.max(0, look.transparency)) / 100;
    return [{ id: s.id, roomId: s.roomId, color: look.color, opacity, positions }];
  });
}
