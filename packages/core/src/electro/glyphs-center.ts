// Znaky na strop opsané z legendy uživatele (Corel SVG, zdroj pravdy tvarů 2026-11-27): svítidla,
// hlásiče, Wi-Fi, kamera. Kotva = střed značky (střed kruhu, u Wi-Fi střed obálky).
import { arc, circle, disc, fill, line, poly, text, v, type Glyph } from './glyph-shapes.ts';
import { fromLegend } from './legend.ts';
import type { SymbolShape } from './types.ts';

const X = 6442.73;
const g = (cx: number, cy: number, shapes: SymbolShape[]): Glyph => fromLegend(v(cx, cy), shapes);
/** Kříž svítidla: úhlopříčky čtverce s polovinou strany `h` kolem středu. */
const cross = (cx: number, cy: number, h: number): SymbolShape[] => [
  line(v(cx - h, cy + h), v(cx + h, cy - h)),
  line(v(cx - h, cy - h), v(cx + h, cy + h)),
];
/** Kříž uvnitř kruhu r = 136 (polovina strany 96,2). */
const INNER = 96.2;

export const CENTER_GLYPHS: Record<string, Glyph> = {
  lamp: g(X, 11196.02, [circle(v(X, 11196.02), 136), ...cross(X, 11196.02, 187)]),
  'lamp-surface': g(X, 11716.02, [circle(v(X, 11716.02), 136), ...cross(X, 11716.02, INNER)]),
  'lamp-pendant': g(X, 12236.02, [
    circle(v(X, 12236.02), 136),
    disc(v(X, 12236.02), 34),
    circle(v(X, 12236.02), 34),
    ...cross(X, 12236.02, INNER),
  ]),
  'lamp-sensor': g(6382.93, 14375.82, [
    circle(v(6382.93, 14375.82), 136),
    arc(v(6382.93, 14375.82), 204, 20, 70),
    arc(v(6382.93, 14375.82), 272, 20, 70),
    ...cross(6382.93, 14375.82, INNER),
  ]),
  smoke: g(X, 19716.02, [circle(v(X, 19716.02), 136), text(v(X, 19716.02), 'S', 136)]),
  co: g(X, 20236.02, [circle(v(X, 20236.02), 153), text(v(X, 20236.02), 'CO', 102)]),
  wifi: g(X, 16316.02, [
    disc(v(X, 16441.82), 20.4),
    circle(v(X, 16441.82), 20.4),
    ...[102, 187, 272].map((r) => arc(v(X, 16441.82), r, 45, 135)),
  ]),
  'camera-ceiling': g(X, 22836.02, [
    circle(v(X, 22836.02), 136),
    fill(v(6395.13, 22883.62), v(6490.33, 22883.62), v(X, 22774.82)),
    poly(v(6395.13, 22883.62), v(6490.33, 22883.62), v(X, 22774.82)),
  ]),
};
