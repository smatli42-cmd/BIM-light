// Stavebnice znaků (ČSN EN 60617, vlastní kresba): úsečky, oblouky, kroužky a texty v jednotkách
// velikosti značky. Osa y míří od líce stěny do místnosti.
import type { Vec2 } from '../geometry/index.ts';
import type { SymbolShape } from './types.ts';

/** Znak = tvary + šířka (pro skládání slotů vedle sebe). */
export interface Glyph {
  readonly width: number;
  readonly shapes: readonly SymbolShape[];
}

export const v = (x: number, y: number): Vec2 => ({ x, y });
export const line = (...points: Vec2[]): SymbolShape => ({ kind: 'line', points });
export const poly = (...points: Vec2[]): SymbolShape => ({ kind: 'line', points, closed: true });
export const circle = (center: Vec2, r: number): SymbolShape => ({ kind: 'circle', center, r });
export const disc = (center: Vec2, r: number): SymbolShape => ({ kind: 'disc', center, r });
export const fill = (...points: Vec2[]): SymbolShape => ({ kind: 'fill', points });
export const arc = (center: Vec2, r: number, from: number, to: number): SymbolShape => ({
  kind: 'arc',
  center,
  r,
  from,
  to,
});
export const text = (at: Vec2, t: string, size: number): SymbolShape => ({ kind: 'text', at, text: t, size });

/** Přívod od líce stěny k přístroji. */
export const stem = (to: number, from = 0): SymbolShape => line(v(0, from), v(0, to));

/** Obdélník mezi rohy. */
export const rect = (x0: number, y0: number, x1: number, y1: number): SymbolShape =>
  poly(v(x0, y0), v(x1, y0), v(x1, y1), v(x0, y1));

/** Rameno spínače: z kroužku pod úhlem `deg`, na konci kolmá čárka (ČSN EN 60617-11-14). */
export function arm(c: Vec2, r: number, deg: number, length = 0.85, tick = 0.28): SymbolShape[] {
  const a = (deg * Math.PI) / 180;
  const d = v(Math.cos(a), Math.sin(a));
  const end = v(c.x + d.x * length, c.y + d.y * length);
  const side = deg > 90 && deg < 270 ? -1 : 1;
  const perp = v(-d.y * side, d.x * side);
  return [
    line(v(c.x + d.x * r, c.y + d.y * r), end),
    line(end, v(end.x - perp.x * tick, end.y - perp.y * tick)),
  ];
}

/** Svítidlo ⊗ (ČSN EN 60617-11-15-01): kroužek s křížem. */
export function lamp(c: Vec2, r = 0.5): SymbolShape[] {
  const k = r * Math.SQRT1_2;
  return [
    circle(c, r),
    line(v(c.x - k, c.y - k), v(c.x + k, c.y + k)),
    line(v(c.x - k, c.y + k), v(c.x + k, c.y - k)),
  ];
}

/** Krabička na stěně s textem uvnitř (termostat T, wallbox EV, PIR…). */
export const box = (t: string, w = 1.3, size = 0.45): SymbolShape[] => [
  rect(-w / 2, 0.1, w / 2, 0.9),
  ...(t ? [text(v(0, 0.5), t, size)] : []),
];

/** Kroužek se zkratkou uprostřed (hlásič kouře S, detektor CO). */
export const ring = (t: string, size: number): SymbolShape[] => [
  circle(v(0, 0), 0.5),
  text(v(0, 0), t, size),
];
