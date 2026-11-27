// Značka řezu v půdorysu (české zvyklosti, ČSN 01 3130): na koncích krátké velmi tlusté úsečky, mezi nimi
// tenká čerchovaná čára, u obou konců šipka ve směru pohledu a písmeno řezu. Je to anotace: viditelnost
// podle skupiny anotací řezu (základ 28), pera a barva z funkce grafiky (kategorie značek, základ 11),
// velikosti na papíře (základ 29) odvozené od výšky popisu. Kreslí se v půdorysech podlaží, která řez
// protíná (podle rozsahu výšky; bez rozsahu ve všech). Pohledy (fasády) značku v půdorysu nemají.
import type { Primitive, Stroke } from '../drawing/primitives.ts';
import { add, dist, mul, norm, sub, type Vec2 } from '../geometry/index.ts';
import type { Model } from '../model/types.ts';
import { resolveGraphics } from '../style/graphics.ts';
import type { ResolvedEffect } from '../style/types.ts';
import { layerState } from '../view/effective.ts';
import type { View } from '../view/types.ts';
import { annotationFacts } from './facts.ts';
import { sectionFrame } from './frame.ts';
import type { Section } from './types.ts';

/** Násobky výšky popisu: délka tlusté úsečky, délka šipky, hrot, výška písmene. */
export const MARK_SIZES = { end: 3, arrow: 2.4, head: 0.8, letter: 2 } as const;

/** Protíná řez podlaží pohledu? */
export function sectionOnStorey(model: Model, s: Section, storeyId: string): boolean {
  const st = model.storeys[storeyId];
  if (!st || !s.range) return !!st;
  return s.range.bottom < st.elevation + st.height && s.range.top > st.elevation;
}

function arrow(at: Vec2, look: Vec2, h: number, g: ResolvedEffect, stroke: Stroke): Primitive[] {
  const tip = add(at, mul(look, MARK_SIZES.arrow * h));
  const side = { x: -look.y, y: look.x };
  const back = sub(tip, mul(look, MARK_SIZES.head * h * 1.6));
  const head = [
    tip,
    add(back, mul(side, MARK_SIZES.head * h * 0.5)),
    sub(back, mul(side, MARK_SIZES.head * h * 0.5)),
  ];
  return [
    { kind: 'line', points: [at, tip], closed: false, stroke, source: { role: 'šipka řezu' } },
    { kind: 'fill', polygon: head, color: g.lineColor, transparency: 0, source: { role: 'šipka řezu' } },
  ];
}

/** Značka jednoho řezu v měřítku pohledu. */
export function drawSectionMark(
  s: Section,
  g: ResolvedEffect,
  scale: number,
  labelText: number,
): Primitive[] {
  if (!g.visible) return [];
  const h = labelText * scale;
  const f = sectionFrame(s);
  const d = norm(sub(s.end, s.start));
  const len = dist(s.start, s.end);
  const endLen = Math.min(MARK_SIZES.end * h, len / 3);
  const thick: Stroke = { pen: g.cutPen, color: g.lineColor, lineType: 'solid' };
  const thin: Stroke = { pen: g.projectionPen, color: g.lineColor, lineType: 'dash-dot' };
  const a1 = add(s.start, mul(d, endLen));
  const b1 = sub(s.end, mul(d, endLen));
  const src = { elementId: s.id, role: 'značka řezu' };
  const out: Primitive[] = [
    { kind: 'line', points: [s.start, a1], closed: false, stroke: thick, source: src },
    { kind: 'line', points: [b1, s.end], closed: false, stroke: thick, source: src },
    { kind: 'line', points: [a1, b1], closed: false, stroke: thin, source: src },
  ];
  for (const p of [s.start, s.end]) {
    out.push(...arrow(p, f.look, h, g, { ...thin, lineType: 'solid' }));
    const at = add(p, mul(f.look, (MARK_SIZES.arrow + MARK_SIZES.letter * 0.7) * h));
    out.push({
      kind: 'text',
      at,
      text: s.mark,
      heightMm: labelText * MARK_SIZES.letter,
      angle: 0,
      bold: true,
      color: g.lineColor,
      source: src,
    });
  }
  return out;
}

/** Značky všech řezů viditelných v půdorysu pohledu. */
export function drawSectionMarks(model: Model, view: View): Primitive[] {
  return Object.values(model.sections ?? {}).flatMap((s) => {
    if (s.kind !== 'section' || !sectionOnStorey(model, s, view.storeyId)) return [];
    if (!layerState(model.display, view, s.annotationLayerId).visible) return [];
    const g = resolveGraphics(model.display, view, annotationFacts(s.id, 'symbol')).effect;
    return drawSectionMark(s, g, view.scale, model.display.paperSizes.labelText);
  });
}
