// Převod tvarů z legendy uživatele (Corel SVG, A4, jednotka 0,01 mm, osa y dolů) na znak značky:
// jednotka = velikost značky 4 mm (400 jednotek legendy), osa y od líce stěny nahoru (do místnosti).
// Tvary se opisují v souřadnicích legendy; kotva = místo osazení (u značky na stěnu spodní hrana
// kresby ve středu řádku, u značky na strop střed). Úhly oblouků se zadávají už s osou y nahoru.
import type { Vec2 } from '../geometry/index.ts';
import type { Glyph } from './glyph-shapes.ts';
import type { SymbolShape } from './types.ts';

/** Jednotek legendy (0,01 mm) na velikost značky 4 mm. */
export const LEGEND_UNIT = 400;
/** Střed sloupce „Značka“ v legendě (x). */
export const LEGEND_COLUMN = 6442.73;

function convertPoint(p: Vec2, a: Vec2): Vec2 {
  const r = (n: number) => Math.round(n * 1e4) / 1e4;
  return { x: r((p.x - a.x) / LEGEND_UNIT), y: r((a.y - p.y) / LEGEND_UNIT) };
}

function convert(s: SymbolShape, a: Vec2): SymbolShape {
  const pt = (p: Vec2) => convertPoint(p, a);
  const len = (n: number) => Math.round((n / LEGEND_UNIT) * 1e4) / 1e4;
  switch (s.kind) {
    case 'line':
      return { ...s, points: s.points.map(pt) };
    case 'fill':
      return { ...s, points: s.points.map(pt) };
    case 'circle':
    case 'disc':
      return { ...s, center: pt(s.center), r: len(s.r) };
    case 'arc':
      return { ...s, center: pt(s.center), r: len(s.r) };
    case 'text':
      return { ...s, at: pt(s.at), size: len(s.size) };
  }
}

/** Znak z tvarů legendy s kotvou `anchor` (souřadnice legendy). */
export const fromLegend = (anchor: Vec2, shapes: readonly SymbolShape[]): Glyph => ({
  shapes: shapes.map((s) => convert(s, anchor)),
});

/** Kotva značky na stěnu: střed sloupce, spodní hrana kresby řádku (y legendy). */
export const wallAnchor = (bottom: number, x = LEGEND_COLUMN): Vec2 => ({ x, y: bottom });
