// Kresba délkové kóty v řezu podle ČSN (jako kóta v půdorysu): kótovací čára, šikmé čárky na koncích, krátké
// odkazové čáry, číslo v mm nad čarou (u svislé kóty natočené, čitelné zprava). Pero, barva z funkce grafiky
// (kategorie kót), velikosti z papíru (základ 29). Viditelnost podle skupiny anotací (základ 28).
import type { Primitive, Stroke } from '../drawing/primitives.ts';
import type { Vec2 } from '../geometry/index.ts';
import type { Model } from '../model/types.ts';
import { annotationFacts } from '../section/facts.ts';
import type { Section } from '../section/types.ts';
import { resolveGraphics } from '../style/graphics.ts';
import type { PaperSizes, ResolvedEffect } from '../style/types.ts';
import { layerState } from '../view/effective.ts';
import type { SectionDimension } from './types.ts';
import { sectionRefCoord } from './value.ts';

/** Body kóty na výkrese řezu (začátek a konec kótovací čáry); null = odkaz neplatí. */
export function sectionDimPoints(model: Model, s: Section, d: SectionDimension): [Vec2, Vec2] | null {
  const a = sectionRefCoord(model, s, d.a);
  const b = sectionRefCoord(model, s, d.b);
  if (a === null || b === null) return null;
  return d.orientation === 'vertical'
    ? [
        { x: d.offset, y: a },
        { x: d.offset, y: b },
      ]
    : [
        { x: a, y: d.offset },
        { x: b, y: d.offset },
      ];
}

/** Šikmá čárka a krátká odkazová čára na konci kótovací čáry. */
function endMarks(
  p: Vec2,
  vertical: boolean,
  t: number,
  ext: number,
  line: (points: Vec2[], role: string) => Primitive,
): Primitive[] {
  const across = vertical
    ? [
        { x: p.x - ext, y: p.y },
        { x: p.x + ext, y: p.y },
      ]
    : [
        { x: p.x, y: p.y - ext },
        { x: p.x, y: p.y + ext },
      ];
  const tick = [
    { x: p.x - t, y: p.y - t },
    { x: p.x + t, y: p.y + t },
  ];
  return [line(tick, 'značka kóty'), line(across, 'odkazová čára')];
}

export function drawSectionDim(
  d: SectionDimension,
  pts: [Vec2, Vec2],
  sizes: PaperSizes,
  scale: number,
  g: ResolvedEffect,
): Primitive[] {
  const stroke: Stroke = { pen: g.projectionPen, color: g.lineColor, lineType: 'solid' };
  const source = (role: string) => ({ dimensionId: d.id, role });
  const line = (points: Vec2[], role: string): Primitive => ({
    kind: 'line',
    points,
    closed: false,
    stroke,
    source: source(role),
  });
  const [a, b] = pts;
  const vertical = d.orientation === 'vertical';
  const t = (sizes.dimensionTick / 2) * scale;
  const ext = sizes.extensionOvershoot * scale;
  const out: Primitive[] = [
    line([a, b], 'kótovací čára'),
    ...[a, b].flatMap((p) => endMarks(p, vertical, t, ext, line)),
  ];
  const gap = (sizes.dimensionTextGap + sizes.dimensionText / 2) * scale;
  const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  const value = String(Math.round(Math.abs(vertical ? b.y - a.y : b.x - a.x)));
  out.push({
    kind: 'text',
    at: vertical ? { x: mid.x - gap, y: mid.y } : { x: mid.x, y: mid.y + gap },
    text: value,
    heightMm: sizes.dimensionText,
    angle: vertical ? Math.PI / 2 : 0,
    color: g.lineColor,
    source: source('číslo kóty'),
  });
  return out;
}

/** Délkové kóty řezu (skupina anotací, funkce grafiky kategorie kót). */
export function drawSectionDims(model: Model, s: Section): Primitive[] {
  return Object.values(model.sectionDims ?? {}).flatMap((d) => {
    if (d.sectionId !== s.id || !layerState(model.display, s, d.annotationLayerId).visible) return [];
    const pts = sectionDimPoints(model, s, d);
    const g = resolveGraphics(model.display, s, annotationFacts(d.id, 'dimension')).effect;
    return pts && g.visible ? drawSectionDim(d, pts, model.display.paperSizes, s.scale, g) : [];
  });
}
