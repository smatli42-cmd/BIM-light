// Stavebnice znaků: úsečky, oblouky, kroužky, výplně a texty v jednotkách velikosti značky (tvary opsané
// z legendy uživatele, legend.ts). Osa y míří od líce stěny do místnosti.
import type { Vec2 } from '../geometry/index.ts';
import type { SymbolShape } from './types.ts';

/** Znak = tvary v jednotkách značky (šířka pro sloty se počítá z obálky). */
export interface Glyph {
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

/** Obdélník mezi rohy. */
export const rect = (x0: number, y0: number, x1: number, y1: number): SymbolShape =>
  poly(v(x0, y0), v(x1, y0), v(x1, y1), v(x0, y1));
