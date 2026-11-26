// Posun čísla kóty po kótovací čáře (pokyn uživatele 2026-11-27; Revit „přesunout text“, ČSN: u krátké
// kóty číslo vedle, na prodloužené kótovací čáře). Jen přímá kótovací čára (lineární, délka, tětiva).
import { add, dist, dot, mul, norm, sub, type Vec2 } from '../geometry/index.ts';
import type { Model } from '../model/types.ts';
import type { PaperSizes } from '../style/types.ts';
import { dimensionText } from './format.ts';
import type { DimensionLayout } from './layout.ts';
import { measureDimension } from './measure.ts';
import type { Dimension } from './types.ts';

/** Přibližná šířka znaku vůči výšce písma (číslice písma kót). */
const CHAR = 0.6;

/** Rozložení s posunutým číslem; kótovací čára se prodlouží, aby číslo leželo nad ní. */
export function withTextShift(
  model: Model,
  d: Dimension,
  lay: DimensionLayout,
  scale: number,
  paper: PaperSizes,
): DimensionLayout {
  const shift = d.textShift ?? 0;
  const [a, b] = lay.line;
  if (!shift || lay.line.length !== 2 || !a || !b || dist(a, b) < 1e-6) return lay;
  const dir = norm(sub(b, a));
  const len = dist(a, b);
  const textAt = add(lay.textAt, mul(dir, shift));
  const half = (dimensionText(d, measureDimension(model, d)).length * paper.dimensionText * CHAR * scale) / 2;
  const c = dot(sub(textAt, a), dir);
  const gap = paper.extensionGap * scale;
  const line: Vec2[] = [a, b];
  if (c - half < 0) line.unshift(add(a, mul(dir, c - half - gap)));
  if (c + half > len) line.push(add(a, mul(dir, c + half + gap)));
  return { ...lay, line, textAt };
}

/** Posun čísla, aby leželo u bodu `p` (průmět na kótovací čáru); 0 = střed. */
export function textShiftAt(lay: DimensionLayout, d: Dimension, p: Vec2): number {
  const [a, b] = [lay.line[0], lay.line.at(-1)];
  if (!a || !b || dist(a, b) < 1e-6) return 0;
  const dir = norm(sub(b, a));
  const base = sub(lay.textAt, mul(dir, d.textShift ?? 0));
  return dot(sub(p, base), dir);
}
