// Výšková kóta v půdorysu (české zvyklosti, vzor Arditu): hodnota horního líce podlahy / desky v bodě
// (relativně k ±0,000) v obdélníkovém rámečku tenkou čarou, bez praporku. Druhá značka „kroužek“: kroužek
// v bodě s vyplněnou horní polovinou, odkazová čára k vodorovné poličce, nad ní výška k ±0,000, pod ní
// výška nad úrovní podlaží. Anotace podlaží se skupinou anotací a zámkem (základ 28), asociativní: odkazuje
// na desku (horní líc), nebo na úroveň podlaží, když v bodě žádná deska není.
import type { Primitive, PrimitiveSource, Stroke } from '../drawing/primitives.ts';
import type { Vec2 } from '../geometry/index.ts';
import type { Id } from '../ids/index.ts';
import type { Model } from '../model/types.ts';
import { slabLevels } from '../slab/geometry.ts';
import { pointInSlab } from '../slab/pick.ts';
import { allSlabs } from '../slab/queries.ts';
import type { PaperSizes, ResolvedEffect } from '../style/types.ts';
import { levelMarkSize } from './symbol.ts';
import { annotationFacts } from '../section/facts.ts';
import { resolveGraphics } from '../style/graphics.ts';
import { layerState } from '../view/effective.ts';
import type { LevelRef } from './types.ts';
import { absoluteText, elevationText, levelZ } from './value.ts';

/** Značka v půdorysu: rámeček (hlavní, Ardit), nebo kroužek s poličkou. */
export type PlanLevelMarker = 'box' | 'circle';
export const PLAN_LEVEL_MARKERS: readonly PlanLevelMarker[] = ['box', 'circle'];

export interface PlanLevelDimension {
  readonly id: Id;
  readonly storeyId: Id;
  readonly ref: LevelRef;
  /** Kótovaný bod v půdorysu (mm). */
  readonly point: Vec2;
  /** Střed textu (rámeček), u kroužku začátek poličky. */
  readonly textAt: Vec2;
  readonly marker: PlanLevelMarker;
  readonly absolute: boolean;
  readonly annotationLayerId: Id;
  readonly locked: boolean;
}

/** Na co kóta v bodě ukazuje: horní líc nejvyšší desky podlaží pod bodem, jinak úroveň podlaží. */
export function planLevelRef(model: Model, storeyId: Id, p: Vec2): LevelRef {
  const top = allSlabs(model)
    .filter((s) => s.storeyId === storeyId && s.variant.kind === 'main' && pointInSlab(s, p))
    .sort((a, b) => slabLevels(model, b).top - slabLevels(model, a).top)[0];
  return top ? { kind: 'edge', elementId: top.id, edge: 'top' } : { kind: 'storey', storeyId };
}

/** Text kóty; null = odkaz neplatí. `second` = výška nad úrovní podlaží (spodní text kroužku). */
export function planLevelTexts(model: Model, d: PlanLevelDimension): { main: string; second: string } | null {
  const z = levelZ(model, d.ref);
  if (z === null) return null;
  const base = model.storeys[d.storeyId]?.elevation ?? 0;
  return { main: d.absolute ? absoluteText(model, z) : elevationText(z), second: elevationText(z - base) };
}

/** Přibližná šířka textu na papíře (mm) – písmo kreslí vykreslení, jádro jen odhaduje rámeček. */
const textWidth = (text: string, h: number) => text.length * h * 0.62;

const circle = (c: Vec2, r: number, a0: number, a1: number, n = 24): Vec2[] =>
  Array.from({ length: n + 1 }, (_, i) => {
    const a = a0 + ((a1 - a0) * i) / n;
    return { x: c.x + r * Math.cos(a), y: c.y + r * Math.sin(a) };
  });

interface Painter {
  readonly text: (at: Vec2, t: string) => Primitive;
  readonly line: (points: Vec2[], closed?: boolean) => Primitive;
  readonly fill: (polygon: Vec2[]) => Primitive;
}

function painter(id: Id, g: ResolvedEffect, th: number): Painter {
  const source: PrimitiveSource = { dimensionId: id, role: 'výšková kóta' };
  const stroke: Stroke = { pen: g.projectionPen, color: g.lineColor, lineType: 'solid' };
  return {
    text: (at, t) => ({ kind: 'text', at, text: t, heightMm: th, angle: 0, color: g.lineColor, source }),
    line: (points, closed = false) => ({ kind: 'line', points, closed, stroke, source }),
    fill: (polygon) => ({ kind: 'fill', polygon, color: g.lineColor, transparency: 0, source }),
  };
}

/** Rámeček kolem hodnoty (tenká čára). */
function boxMark(d: PlanLevelDimension, text: string, th: number, scale: number, p: Painter): Primitive[] {
  const w = (textWidth(text, th) / 2 + th * 0.4) * scale;
  const h = th * 0.9 * scale;
  const { x, y } = d.textAt;
  const box = [
    { x: x - w, y: y - h },
    { x: x + w, y: y - h },
    { x: x + w, y: y + h },
    { x: x - w, y: y + h },
  ];
  return [p.line(box, true), p.text(d.textAt, text)];
}

export function drawPlanLevel(
  d: PlanLevelDimension,
  texts: { main: string; second: string },
  sizes: PaperSizes,
  scale: number,
  g: ResolvedEffect,
): Primitive[] {
  const th = sizes.labelText;
  const p = painter(d.id, g, th);
  if (d.marker === 'box') return boxMark(d, texts.main, th, scale, p);
  const r = (levelMarkSize(sizes) / 2) * scale;
  const shelf = Math.max(textWidth(texts.main, th), textWidth(texts.second, th)) * scale;
  const dir = d.textAt.x >= d.point.x ? 1 : -1;
  const end = { x: d.textAt.x + dir * shelf, y: d.textAt.y };
  const mid = (d.textAt.x + end.x) / 2;
  return [
    p.fill(circle(d.point, r, 0, Math.PI)),
    p.line(circle(d.point, r, 0, 2 * Math.PI), true),
    p.line([d.point, d.textAt, end]),
    p.text({ x: mid, y: d.textAt.y + th * 0.8 * scale }, texts.main),
    p.text({ x: mid, y: d.textAt.y - th * 0.8 * scale }, texts.second),
  ];
}

/** Výškové kóty podlaží pohledu (půdorys): skupina anotací, funkce grafiky (kategorie kót). */
export function drawPlanLevels(
  model: Model,
  view: { storeyId: Id; scale: number } & Parameters<typeof resolveGraphics>[1],
): Primitive[] {
  return Object.values(model.planLevelDims ?? {}).flatMap((d) => {
    if (d.storeyId !== view.storeyId || !layerState(model.display, view, d.annotationLayerId).visible)
      return [];
    const texts = planLevelTexts(model, d);
    const g = resolveGraphics(model.display, view, annotationFacts(d.id, 'dimension')).effect;
    if (!texts || !g.visible) return [];
    return drawPlanLevel(d, texts, model.display.paperSizes, view.scale, g);
  });
}
