// Průřez konstrukcí v místě popisu skladby (pravidlo v jádře, platí pro myš i AI): bod uchycení, kolmice ke
// konstrukci a oba líce, mezi nimiž odkazová čára protne celou skladbu. Deska = svisle, stěna = vodorovně,
// střecha = kolmo k rovině střechy (roof.ts). Bod uchycení se ukládá poměrem (s po délce, t přes tloušťku).
import type { Vec2 } from '../geometry/index.ts';
import type { Id } from '../ids/index.ts';
import type { Model } from '../model/types.ts';
import type { CutRow } from '../section/content.ts';
import type { Section } from '../section/types.ts';
import { cachedSectionContent } from '../section-dim/value.ts';
import { AXIS_X, AXIS_Y, type LeaderAxis } from './leader.ts';
import { roofCross } from './roof.ts';
import type { TagAnchor } from './types.ts';

export interface TagCross {
  readonly anchor: Vec2;
  /** Jednotková kolmice ke konstrukci (směr první části odkazové čáry). */
  readonly axis: LeaderAxis;
  /** Líc na straně −axis (deska spodní, stěna levý, střecha SDK). */
  readonly back: Vec2;
  /** Líc na straně +axis (deska horní, stěna pravý, střecha krytina). */
  readonly front: Vec2;
}

const clamp = (v: number) => Math.min(1, Math.max(0, Number.isFinite(v) ? v : 0.5));

/** Řezaný prvek na výkrese (rozsah u, z); null = rovina řezu prvek neprotíná. */
export function cutRowOf(model: Model, s: Section, elementId: string): CutRow | null {
  return cachedSectionContent(model, s).cut.find((r) => r.elementId === elementId) ?? null;
}

/** Bod uchycení na výkrese (u, z) v obdélníku řezaného prvku. */
export const anchorPoint = (row: CutRow, a: TagAnchor): Vec2 => ({
  x: row.u0 + (row.u1 - row.u0) * a.s,
  y: row.bottom + (row.top - row.bottom) * a.t,
});

/** Poměrový bod uchycení z bodu výkresu (oříznutý na obdélník prvku). */
export const anchorOf = (row: CutRow, p: Vec2): TagAnchor => ({
  s: clamp((p.x - row.u0) / (row.u1 - row.u0)),
  t: clamp((p.y - row.bottom) / (row.top - row.bottom)),
});
const along = (p: Vec2, n: Vec2, k: number): Vec2 => ({ x: p.x + n.x * k, y: p.y + n.y * k });

/** Průřez v místě uloženého bodu uchycení; null = rovina řezu prvek neprotíná. */
export function tagCross(model: Model, s: Section, elementId: Id, a: TagAnchor): TagCross | null {
  const row = cutRowOf(model, s, elementId);
  if (!row) return null;
  const category = model.elements[elementId]?.category;
  if (category === 'roof') {
    const r = roofCross(model, s, elementId, row.u0 + (row.u1 - row.u0) * a.s);
    if (r) {
      const front = along(r.bottom, r.normal, r.thickness);
      return { anchor: along(r.bottom, r.normal, r.thickness * a.t), axis: r.normal, back: r.bottom, front };
    }
  }
  const anchor = anchorPoint(row, a);
  if (category === 'wall')
    return { anchor, axis: AXIS_X, back: { x: row.u0, y: anchor.y }, front: { x: row.u1, y: anchor.y } };
  return { anchor, axis: AXIS_Y, back: { x: anchor.x, y: row.bottom }, front: { x: anchor.x, y: row.top } };
}

/** Bod uchycení (poměrem) z bodu výkresu; null = rovina řezu prvek neprotíná. */
export function tagAnchorOf(model: Model, s: Section, elementId: Id, p: Vec2): TagAnchor | null {
  const row = cutRowOf(model, s, elementId);
  if (!row) return null;
  const a = anchorOf(row, p);
  if (model.elements[elementId]?.category !== 'roof') return a;
  const r = roofCross(model, s, elementId, row.u0 + (row.u1 - row.u0) * a.s);
  if (!r) return a;
  // Pata kolmice z bodu na spodní líc (líc je v místě přímka) – bod uchycení pak leží přesně v bodě p.
  const k = (p.x - r.bottom.x) * r.normal.x + (p.y - r.bottom.y) * r.normal.y;
  const foot = p.x - r.normal.x * k;
  return { s: clamp((foot - row.u0) / (row.u1 - row.u0)), t: clamp(k / (r.thickness || 1)) };
}
