// Kresba kóty podle ČSN: kótovací čára se šikmými čárkami, odkazové čáry, číslo nad čarou.
// Pero, barva a typ čáry přicházejí z funkce grafiky (základ 11); velikosti z papíru (základ 29).
import type { Primitive, Stroke } from '../drawing/primitives.ts';
import { add, mul, rotate, sub, type Vec2 } from '../geometry/index.ts';
import type { Model } from '../model/types.ts';
import type { PaperSizes, ResolvedEffect } from '../style/types.ts';
import { dimensionText } from './format.ts';
import { layoutDimension } from './layout.ts';
import { measureDimension } from './measure.ts';
import type { Dimension } from './types.ts';

function tick(at: Vec2, dir: Vec2, half: number): Vec2[] {
  const d = rotate(dir, { x: 0, y: 0 }, Math.PI / 4);
  return [sub(at, mul(d, half)), add(at, mul(d, half))];
}

export function drawDimension(
  model: Model,
  d: Dimension,
  scale: number,
  paper: PaperSizes,
  g: ResolvedEffect,
): Primitive[] {
  if (!g.visible) return [];
  const lay = layoutDimension(model, d, scale, paper);
  if (!lay) return [];
  const stroke: Stroke = { pen: g.projectionPen, color: g.lineColor, lineType: 'solid' };
  const src = (role: string) => ({ dimensionId: d.id, role });
  const line = (points: readonly Vec2[], role: string): Primitive => ({
    kind: 'line',
    points,
    closed: false,
    stroke,
    source: src(role),
  });
  const out: Primitive[] = [line(lay.line, 'kótovací čára')];
  for (const e of lay.extensions) out.push(line(e, 'odkazová čára'));
  for (const t of lay.ticks)
    out.push(line(tick(t.at, t.dir, (paper.dimensionTick / 2) * scale), 'značka kóty'));
  out.push({
    kind: 'text',
    at: lay.textAt,
    text: dimensionText(d, measureDimension(model, d)),
    heightMm: paper.dimensionText,
    angle: lay.textAngle,
    color: g.lineColor,
    source: src('číslo kóty'),
  });
  return out;
}
