// Co místnost ohraničuje (prvky stavby 9): stěny, které protnou výšku hledání hranic nad podlažím
// místnosti (i stěna z podlaží pod, která jde přes dvě podlaží), ve stavu, který k místnosti patří
// (nová místnost nevidí bouranou stěnu, stávající nevidí novou), hlavní model nebo varianta místnosti.
// Výklenky (niky) se ze stěn vyříznou, jen když splní ČSN 73 4301: k podlaze, hloubka ≥ 0,30 m a světlá
// výška ≥ 2,00 m.
import { offsetPath, pathLength, pointAt, tessellate, type Path, type Vec2 } from '../geometry/index.ts';
import type { Id } from '../ids/index.ts';
import type { Model, Status, VariantRef } from '../model/types.ts';
import type { Opening } from '../opening/types.ts';
import { wallGeometry } from '../wall/geometry.ts';
import { allWalls } from '../wall/queries.ts';
import type { Wall } from '../wall/types.ts';
import { wallHeight } from '../wall-height/resolve.ts';
import { NICHE_MIN_DEPTH, NICHE_MIN_HEIGHT, ROOM_BOUNDARY_HEIGHT } from './types.ts';

/** Stavy stěn, které ohraničují místnost daného stavu. */
export const boundingStatuses = (s: Status): readonly Status[] =>
  s === 'new' ? ['existing', 'new'] : ['existing', 'demolished'];

const sameVariant = (w: VariantRef, r: VariantRef) =>
  w.kind === 'main' || (r.kind === 'variant' && w.setId === r.setId && w.variantId === r.variantId);

export function boundingWalls(model: Model, storeyId: Id, status: Status, variant: VariantRef): Wall[] {
  const storey = model.storeys[storeyId];
  if (!storey) return [];
  const at = storey.elevation + ROOM_BOUNDARY_HEIGHT;
  const statuses = boundingStatuses(status);
  return allWalls(model).filter((w) => {
    if (!statuses.includes(w.status) || !sameVariant(w.variant, variant)) return false;
    if (w.storeyId === storeyId) return true;
    try {
      const h = wallHeight(model, w);
      return h.bottom <= at && h.top > at;
    } catch {
      return false;
    }
  });
}

/** Započítá se výklenek do plochy místnosti? (ČSN 73 4301, prvky stavby 9) */
export const nicheCounts = (o: Opening): boolean =>
  o.kind === 'niche' && o.sill <= 1 && o.depth >= NICHE_MIN_DEPTH && o.height >= NICHE_MIN_HEIGHT;

/** Body křivky mezi poměry délky t0..t1. */
function subPath(p: Path, t0: number, t1: number): Vec2[] {
  const n = p.kind === 'arc' ? Math.max(2, tessellate(p).length) : 2;
  return Array.from({ length: n }, (_, i) => pointAt(p, t0 + ((t1 - t0) * i) / (n - 1)));
}

/** Půdorys výklenku: pruh od líce do hloubky po délce otvoru. */
export function nicheOutline(model: Model, w: Wall, o: Opening): Vec2[] {
  const sec = wallGeometry(model, w, Number.NEGATIVE_INFINITY).section;
  const face = sec.faces[o.side];
  const into = Math.sign(sec.faces.axis - face) || 1;
  const len = pathLength(w.path) || 1;
  const [t0, t1] = [o.offset / len, (o.offset + o.width) / len];
  const outer = subPath(offsetPath(w.path, face), t0, t1);
  const inner = subPath(
    offsetPath(w.path, face + into * Math.min(o.depth, Math.abs(sec.faces.ref - sec.faces.opp))),
    t0,
    t1,
  );
  return [...outer, ...inner.reverse()];
}

export interface BoundingShapes {
  /** Obrysy stěn (sjednocení vrstev po napojení, bez otvorů). */
  readonly solids: readonly (readonly Vec2[])[];
  /** Započítané výklenky (vyříznou se ze stěn). */
  readonly voids: readonly (readonly Vec2[])[];
  readonly niches: readonly Id[];
}

export function boundingShapes(model: Model, walls: readonly Wall[]): BoundingShapes {
  const ids = new Set(walls.map((w) => w.id));
  const niches = Object.values(model.openings).filter((o) => ids.has(o.hostId) && nicheCounts(o));
  const byId = new Map(walls.map((w) => [w.id, w]));
  return {
    solids: walls.flatMap((w) => wallGeometry(model, w, Number.NEGATIVE_INFINITY).outlines),
    voids: niches.map((o) => nicheOutline(model, byId.get(o.hostId) as Wall, o)),
    niches: niches.map((o) => o.id),
  };
}
