// Tvary značky prvku v jednotkách značky (koncepce 3): sloty ze znaků vedle sebe, vlastní tvary, liniové
// svítidlo a rozvaděč ve skutečné velikosti (mm modelu převedené na jednotky). Podrobnost (základ 5):
// hrubá = jen obrys rozvaděče, jemná = u zapuštěného rozvaděče i líc stěny přes skříň.
import type { Model } from '../model/types.ts';
import type { Detail } from '../style/types.ts';
import { GLYPHS } from './glyphs.ts';
import { fill, line, rect, v } from './glyph-shapes.ts';
import { boardOf, electroTypeOf, lengthOf, slotsOf } from './place.ts';
import type { ElectroElement, SymbolShape } from './types.ts';

/** Tvary se svým posunem po ose x (slot). */
export interface PlacedShapes {
  readonly dx: number;
  readonly shapes: readonly SymbolShape[];
  /** Znak slotu (rámeček: každý slot má barvu své skupiny). */
  readonly glyph?: string;
}

const SLOT_GAP = 0.1;

function slotShapes(keys: readonly string[]): PlacedShapes[] {
  const glyphs = keys.flatMap((k) => (GLYPHS[k] ? [{ key: k, g: GLYPHS[k] }] : []));
  const total = glyphs.reduce((s, { g }) => s + g.width, 0) + SLOT_GAP * Math.max(0, glyphs.length - 1);
  let x = -total / 2;
  return glyphs.map(({ key, g }) => {
    const dx = x + g.width / 2;
    x += g.width + SLOT_GAP;
    return { dx, shapes: g.shapes, glyph: key };
  });
}

function boardShapes(m: Model, el: ElectroElement, unit: number, detail: Detail): SymbolShape[] {
  const b = boardOf(m, el);
  const t = electroTypeOf(m, el);
  const w = b.width / unit / 2;
  const y0 = -b.recess / unit;
  const y1 = (b.depth - b.recess) / unit;
  const out: SymbolShape[] = [rect(-w, y0, w, y1)];
  if (detail === 'fine' && b.recess > 0) out.push(line(v(-w, 0), v(w, 0)));
  if (detail === 'coarse' || t?.symbol.kind !== 'board') return out;
  const mid = (y0 + y1) / 2;
  switch (t.symbol.board) {
    case 'main':
      return [...out, fill(v(-w, mid), v(w, mid), v(w, y1), v(-w, y1))];
    case 'sub':
      return [...out, line(v(-w, y0), v(w, y1)), line(v(-w, y1), v(w, y0))];
    case 'meter':
      return [...out, fill(v(-w, y0), v(w, y1), v(-w, y1))];
    case 'data':
      return [...out, line(v(-w, y0), v(w, y1))];
  }
}

function linearShapes(m: Model, el: ElectroElement, unit: number, lines: 1 | 2): SymbolShape[] {
  const l = lengthOf(m, el) / unit / 2;
  const y = el.host.kind === 'wall' ? 0.3 : 0;
  const rows = lines === 1 ? [y] : [y - 0.12, y + 0.12];
  return [
    ...rows.map((r) => line(v(-l, r), v(l, r))),
    line(v(-l, y - 0.3), v(-l, y + 0.3)),
    line(v(l, y - 0.3), v(l, y + 0.3)),
  ];
}

/** Všechny tvary značky prvku. `unit` = mm modelu na jednotku značky. */
export function symbolShapes(m: Model, el: ElectroElement, unit: number, detail: Detail): PlacedShapes[] {
  const t = electroTypeOf(m, el);
  if (!t) return [];
  switch (t.symbol.kind) {
    case 'glyphs':
      return slotShapes(slotsOf(m, el));
    case 'shapes':
      return [{ dx: 0, shapes: t.symbol.shapes }];
    case 'linear':
      return [{ dx: 0, shapes: linearShapes(m, el, unit, t.symbol.lines) }];
    case 'board':
      return [{ dx: 0, shapes: boardShapes(m, el, unit, detail) }];
  }
}

/** Obálka tvarů v jednotkách značky (pro umístění popisku). */
export function shapesExtent(placed: readonly PlacedShapes[]) {
  const e = { x0: Infinity, x1: -Infinity, y0: Infinity, y1: -Infinity };
  const add = (x: number, y: number, r = 0) => {
    e.x0 = Math.min(e.x0, x - r);
    e.x1 = Math.max(e.x1, x + r);
    e.y0 = Math.min(e.y0, y - r);
    e.y1 = Math.max(e.y1, y + r);
  };
  for (const { dx, shapes } of placed)
    for (const s of shapes) {
      if (s.kind === 'line' || s.kind === 'fill') s.points.forEach((p) => add(p.x + dx, p.y));
      else if (s.kind === 'text') add(s.at.x + dx, s.at.y, s.size / 2);
      else add(s.center.x + dx, s.center.y, s.r);
    }
  return Number.isFinite(e.x0) ? e : { x0: -0.5, x1: 0.5, y0: -0.5, y1: 0.5 };
}
