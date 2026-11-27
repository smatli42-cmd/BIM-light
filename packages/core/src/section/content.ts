// Obsah řezu jako data (pro AI a budoucí panel): které prvky rovina řezu protíná (rozsah na výkrese u, z
// a materiály vrstev) a které jsou vidět za ní do hloubky pohledu (nejbližší hloubka). Stejný výpočet jako
// kresba (cut.ts, projection.ts) – AI vidí totéž co výkres.
import type { Id } from '../ids/index.ts';
import type { Model } from '../model/types.ts';
import { slabCut, wallCut, type CutPiece } from './cut.ts';
import { sectionFrame } from './frame.ts';
import { ringsOf } from './pieces.ts';
import { slabProjection, wallProjection, type Projected } from './projection.ts';
import type { Section } from './types.ts';
import { sectionElements } from './visible.ts';

export interface CutRow {
  readonly elementId: Id;
  readonly category: string;
  readonly u0: number;
  readonly u1: number;
  readonly bottom: number;
  readonly top: number;
  /** Materiály vrstev v řezu (bez opakování, v pořadí vrstev). */
  readonly materialIds: readonly Id[];
}

export interface SeenRow {
  readonly elementId: Id;
  readonly category: string;
  readonly depth: number;
  readonly u0: number;
  readonly u1: number;
}

const r = (n: number) => Math.round(n);

function bounds(rings: readonly (readonly { x: number; y: number }[])[]) {
  const pts = rings.flat();
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  return {
    u0: r(Math.min(...xs)),
    u1: r(Math.max(...xs)),
    bottom: r(Math.min(...ys)),
    top: r(Math.max(...ys)),
  };
}

function cutRow(id: Id, category: string, pieces: readonly CutPiece[]): CutRow[] {
  if (!pieces.length) return [];
  const b = bounds(pieces.flatMap((p) => ringsOf(p.shapes)));
  return [{ elementId: id, category, ...b, materialIds: [...new Set(pieces.map((p) => p.materialId))] }];
}

function seenRow(category: string, p: Projected | null): SeenRow[] {
  if (!p) return [];
  const { u0, u1 } = bounds(ringsOf(p.shapes));
  return [{ elementId: p.elementId, category, depth: r(p.depth), u0, u1 }];
}

export function sectionContent(model: Model, s: Section): { cut: CutRow[]; seen: SeenRow[] } {
  const f = sectionFrame(s);
  const els = sectionElements(model, s);
  const m = els.model;
  const cut =
    s.kind === 'section'
      ? [
          ...els.walls.flatMap(({ wall }) => cutRow(wall.id, 'wall', wallCut(m, wall, f, s.range))),
          ...els.slabs.flatMap(({ slab }) => cutRow(slab.id, 'slab', slabCut(m, slab, f, s.range))),
        ]
      : [];
  const seen = [
    ...els.walls.flatMap(({ wall }) => seenRow('wall', wallProjection(m, wall, f, s.range))),
    ...els.slabs.flatMap(({ slab }) => seenRow('slab', slabProjection(m, slab, f, s.range))),
  ].sort((a, b) => a.depth - b.depth);
  return { cut, seen };
}
