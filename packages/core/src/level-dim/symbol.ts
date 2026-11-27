// Značka výškové kóty podle ČSN 01 3420 (praporek): rovnoramenný pravoúhlý trojúhelník (vrcholový úhel 90°)
// hrotem na kótované úrovni, vodorovné raménko na úrovni (širší než trojúhelník), text nad trojúhelníkem
// (u praporku pod hranou pod ním). Relativní kóta nevyplněná, absolutní (Bpv) a terén plná; styl může
// vyplňovat vždy (Ardit). Velikost na papíře (`paperSizes.levelMark`, základ 29), pero a barva z grafiky.
import type { Primitive, PrimitiveSource, Stroke } from '../drawing/primitives.ts';
import type { PaperSizes, ResolvedEffect } from '../style/types.ts';

/** Raménko je o tolik širší než polovina trojúhelníku (× výška trojúhelníku). */
export const LEVEL_ARM = 1.6;

export interface LevelSymbol {
  /** Bod na kótované úrovni (mm výkresu řezu): x po výkrese, z výška. */
  readonly x: number;
  readonly z: number;
  readonly text: string;
  readonly below: boolean;
  readonly filled: boolean;
}

/** Výška trojúhelníku na papíře (mm); starší balíček zobrazení bez ní = výška popisu. */
export const levelMarkSize = (sizes: PaperSizes): number => sizes.levelMark ?? sizes.labelText;

/** Výška textu výškové kóty na papíře (drobný, vzor Arditu); starší balíček = výška popisu. */
export const levelTextSize = (sizes: PaperSizes): number => sizes.levelText ?? sizes.labelText;

export function drawLevelSymbol(
  m: LevelSymbol,
  sizes: PaperSizes,
  scale: number,
  g: ResolvedEffect,
  source: PrimitiveSource,
): Primitive[] {
  const h = levelMarkSize(sizes) * scale;
  const dir = m.below ? -1 : 1;
  const base = m.z + dir * h;
  // Vrcholový úhel 90° → polovina základny = výška.
  const tri = [
    { x: m.x, y: m.z },
    { x: m.x - h, y: base },
    { x: m.x + h, y: base },
  ];
  const stroke: Stroke = { pen: g.projectionPen, color: g.lineColor, lineType: 'solid' };
  const text = levelTextSize(sizes);
  const out: Primitive[] = [
    { kind: 'line', points: tri, closed: true, stroke, source },
    {
      kind: 'line',
      points: [
        { x: m.x - LEVEL_ARM * h, y: m.z },
        { x: m.x + LEVEL_ARM * h, y: m.z },
      ],
      closed: false,
      stroke,
      source,
    },
    {
      kind: 'text',
      at: { x: m.x, y: base + dir * text * scale * 0.9 },
      text: m.text,
      heightMm: text,
      angle: 0,
      color: g.lineColor,
      source,
    },
  ];
  if (m.filled) out.unshift({ kind: 'fill', polygon: tri, color: g.lineColor, transparency: 0, source });
  return out;
}
