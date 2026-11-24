// Výběr rámečkem (pravidla-interakce: Výběr; kóty 12): zleva doprava jen celé prvky,
// zprava doleva i protnuté. Vybírají se stěny i kóty; filtr podle kategorie.
import type { Vec2 } from '../geometry/index.ts';
import type { Id } from '../ids/index.ts';
import type { Model } from '../model/types.ts';
import { layoutDimension } from '../dimension/layout.ts';
import { isDimensionVisible, isSelectable } from '../view/draw-view.ts';
import type { View } from '../view/types.ts';
import { pointInPolygon, selectableWallGeometry } from './pick.ts';

export interface Rect {
  readonly x0: number;
  readonly y0: number;
  readonly x1: number;
  readonly y1: number;
}

export const rectOf = (a: Vec2, b: Vec2): Rect => ({
  x0: Math.min(a.x, b.x),
  y0: Math.min(a.y, b.y),
  x1: Math.max(a.x, b.x),
  y1: Math.max(a.y, b.y),
});

export function boundsOf(points: readonly Vec2[]): Rect {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
}

const inRect = (p: Vec2, r: Rect) => p.x >= r.x0 && p.x <= r.x1 && p.y >= r.y0 && p.y <= r.y1;

function segmentsCross(a: Vec2, b: Vec2, c: Vec2, d: Vec2): boolean {
  const o = (p: Vec2, q: Vec2, r: Vec2) => (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
  return o(a, b, c) * o(a, b, d) <= 0 && o(c, d, a) * o(c, d, b) <= 0;
}

/** Protíná mnohoúhelník obdélník (nebo leží celý uvnitř / obdélník v něm)? */
export function polygonTouchesRect(poly: readonly Vec2[], r: Rect): boolean {
  if (poly.some((p) => inRect(p, r))) return true;
  const c: Vec2[] = [
    { x: r.x0, y: r.y0 },
    { x: r.x1, y: r.y0 },
    { x: r.x1, y: r.y1 },
    { x: r.x0, y: r.y1 },
  ];
  if (c.some((p) => pointInPolygon(p, poly))) return true;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i] as Vec2;
    const b = poly[(i + 1) % poly.length] as Vec2;
    for (let k = 0; k < 4; k++) if (segmentsCross(a, b, c[k] as Vec2, c[(k + 1) % 4] as Vec2)) return true;
  }
  return false;
}

export interface SelectionFilter {
  readonly walls: boolean;
  readonly dimensions: boolean;
}

export const ALL_CATEGORIES: SelectionFilter = { walls: true, dimensions: true };

/** Body kóty (čára, odkazové čáry, místo čísla) pro výběr rámečkem. */
export function dimensionPoints(model: Model, view: View, id: Id): Vec2[] {
  const d = model.dimensions[id];
  const lay = d && layoutDimension(model, d, view.scale, model.display.paperSizes);
  if (!lay) return [];
  return [...lay.line, ...lay.extensions.flat(), lay.textAt];
}

export interface BoxSelection {
  readonly wallIds: Id[];
  readonly dimensionIds: Id[];
}

export function boxSelect(
  model: Model,
  view: View,
  r: Rect,
  crossing: boolean,
  filter: SelectionFilter = ALL_CATEGORIES,
): BoxSelection {
  const take = (pts: readonly Vec2[]) =>
    pts.length > 0 && (crossing ? polygonTouchesRect(pts, r) : pts.every((p) => inRect(p, r)));
  const wallIds = filter.walls
    ? selectableWallGeometry(model, view)
        .filter((g) => take(g.outline))
        .map((g) => g.wallId)
    : [];
  const dimensionIds = filter.dimensions
    ? Object.values(model.dimensions)
        .filter((d) => isDimensionVisible(model, view, d) && isSelectable(model, view, d.id))
        .filter((d) => take(dimensionPoints(model, view, d.id)))
        .map((d) => d.id)
    : [];
  return { wallIds, dimensionIds };
}
