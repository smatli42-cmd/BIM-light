// Výběr prvků v řezu a pohledu (pokyn uživatele 2026-11-27; pravidla-interakce → Výběr, Revit / Archicad):
// bod výkresu řezu (u, z) → prvky pod ním (řezané kusy, pak pohledové plochy podle hloubky, otvor před svou
// stěnou), rámeček zleva = celé prvky, zprava = i protnuté. Stejný výpočet jako kresba (cut, projection).
import type { PlanePolygon } from '../covering/polygon.ts';
import type { Vec2 } from '../geometry/index.ts';
import type { Id } from '../ids/index.ts';
import type { Model } from '../model/types.ts';
import { openingFootprint } from '../opening/footprint.ts';
import { openingLevels, openingsOf } from '../opening/geometry.ts';
import { pointInPolygon } from '../selection/pick.ts';
import { slabCut, wallCut } from './cut.ts';
import { effectiveFrame, lineIntervals, type SectionFrame } from './frame.ts';
import { extentInZone, slabProjection, wallProjection } from './projection.ts';
import { planePolygon } from '../covering/polygon.ts';
import type { Section } from './types.ts';
import { sectionElements } from './visible.ts';
import type { Wall } from '../wall/types.ts';

/** Plochy prvku na výkrese řezu a jeho hloubka (řezaný = −1, otvor o kousek před svou stěnou). */
export interface SectionShape {
  readonly id: Id;
  readonly category: 'wall' | 'slab' | 'opening';
  readonly depth: number;
  readonly shapes: readonly PlanePolygon[];
}

const rect = (u0: number, z0: number, u1: number, z1: number): Vec2[] => [
  { x: u0, y: z0 },
  { x: u1, y: z0 },
  { x: u1, y: z1 },
  { x: u0, y: z1 },
];

/** Otvory stěny na výkrese: v rovině řezu (úseky půdorysu otvoru) i za ní (rozsah v pásmu pohledu). */
function openingShapes(m: Model, wall: Wall, f: SectionFrame, depth: number): SectionShape[] {
  return openingsOf(m, wall.id).flatMap((o) => {
    const { bottom, top } = openingLevels(m, o, wall);
    const foot = openingFootprint(m, o, wall);
    const cut = lineIntervals(f, [foot]).map(([a, b]) => ({ outer: rect(a, bottom, b, top), holes: [] }));
    const e = cut.length ? null : extentInZone(f, planePolygon(foot));
    const shapes = e ? [{ outer: rect(e.u0, bottom, e.u1, top), holes: [] }] : cut;
    return shapes.length ? [{ id: o.id, category: 'opening' as const, depth: depth - 0.5, shapes }] : [];
  });
}

const cache = new WeakMap<Model, Map<Id, SectionShape[]>>();

/** Plochy všech viditelných prvků řezu (výběr, rámeček). */
export function sectionShapes(model: Model, s: Section): SectionShape[] {
  const byId = cache.get(model) ?? new Map<Id, SectionShape[]>();
  cache.set(model, byId);
  const hit = byId.get(s.id);
  if (hit) return hit;
  const f = effectiveFrame(model.sectionPresets, s);
  const els = sectionElements(model, s);
  const m = els.model;
  const out: SectionShape[] = [];
  for (const { wall } of els.walls) {
    const cut = s.kind === 'section' ? wallCut(m, wall, f, s.range).flatMap((p) => p.shapes) : [];
    const proj = wallProjection(m, wall, f, s.range);
    if (cut.length) out.push({ id: wall.id, category: 'wall', depth: -1, shapes: cut });
    if (proj) out.push({ id: wall.id, category: 'wall', depth: proj.depth, shapes: proj.shapes });
    if (cut.length || proj) out.push(...openingShapes(m, wall, f, cut.length ? -1 : (proj?.depth ?? 0)));
  }
  for (const { slab } of els.slabs) {
    const cut = s.kind === 'section' ? slabCut(m, slab, f, s.range).flatMap((p) => p.shapes) : [];
    const proj = slabProjection(m, slab, f, s.range);
    if (cut.length) out.push({ id: slab.id, category: 'slab', depth: -1, shapes: cut });
    if (proj) out.push({ id: slab.id, category: 'slab', depth: proj.depth, shapes: proj.shapes });
  }
  byId.set(s.id, out);
  return out;
}

function segDist(p: Vec2, a: Vec2, b: Vec2): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const l2 = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2));
  return Math.hypot(p.x - a.x - dx * t, p.y - a.y - dy * t);
}

const nearRing = (p: Vec2, r: readonly Vec2[], tol: number) =>
  r.some((a, i) => segDist(p, a, r[(i + 1) % r.length] as Vec2) <= tol);

function contains(sh: PlanePolygon, p: Vec2, tol: number): boolean {
  if (nearRing(p, sh.outer, tol)) return true;
  return pointInPolygon(p, sh.outer) && !sh.holes.some((h) => pointInPolygon(p, h) && !nearRing(p, h, tol));
}

/** Prvky pod bodem výkresu řezu (u, z), nejbližší první; tolerance v mm výkresu. */
export function sectionPickAt(model: Model, s: Section, p: Vec2, tol: number): Id[] {
  const hits = sectionShapes(model, s)
    .filter((x) => x.shapes.some((sh) => contains(sh, p, tol)))
    .sort((a, b) => a.depth - b.depth);
  return [...new Set(hits.map((h) => h.id))];
}

/** Rámeček na výkrese: `crossing` = i protnuté (zprava doleva), jinak jen celé prvky (zleva doprava). */
export function sectionPickBox(model: Model, s: Section, a: Vec2, b: Vec2, crossing: boolean): Id[] {
  const [x0, x1, y0, y1] = [Math.min(a.x, b.x), Math.max(a.x, b.x), Math.min(a.y, b.y), Math.max(a.y, b.y)];
  const byId = new Map<Id, Vec2[]>();
  for (const x of sectionShapes(model, s))
    byId.set(x.id, [...(byId.get(x.id) ?? []), ...x.shapes.flatMap((sh) => sh.outer)]);
  const ids: Id[] = [];
  for (const [id, pts] of byId) {
    const xs = pts.map((q) => q.x);
    const ys = pts.map((q) => q.y);
    const [bx0, bx1, by0, by1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    const inside = bx0 >= x0 && bx1 <= x1 && by0 >= y0 && by1 <= y1;
    const touches = bx0 <= x1 && bx1 >= x0 && by0 <= y1 && by1 >= y0;
    if (inside || (crossing && touches)) ids.push(id);
  }
  return ids;
}
