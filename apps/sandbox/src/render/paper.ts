// Podklad výkresu (koncepce rozhraní, část 5): „papír“ (bílý) nebo tmavý. Na tmavém podkladu se jen
// pro zobrazení zesvětlí tmavé barvy čar a textů a ztlumí výplně; data, tisk a export mají vždy
// původní barvy (základy 11, 32).
import type { Primitive } from '@bim-light/core';

export type Paper = 'light' | 'dark';

export const PAPER_BG: Readonly<Record<Paper, string>> = { light: '#ffffff', dark: '#1c2027' };

type Rgb = [number, number, number];

function parse(c: string): Rgb | null {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(c.trim());
  if (!m) return null;
  const h =
    (m[1] as string).length === 3 ? [...(m[1] as string)].map((x) => x + x).join('') : (m[1] as string);
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as Rgb;
}

const hex = (c: Rgb) =>
  `#${c
    .map((v) =>
      Math.round(Math.max(0, Math.min(255, v)))
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`;
const luma = ([r, g, b]: Rgb) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

/** Barva čáry nebo textu na podkladu: tmavé barvy se na tmavém podkladu převrátí do světla. */
export function inkColor(c: string, paper: Paper): string {
  const rgb = paper === 'dark' ? parse(c) : null;
  if (!rgb || luma(rgb) > 0.55) return c;
  // Převrácení jasu se zachováním odstínu: černá → světle šedá, tmavě červená → světle červená.
  const l = luma(rgb);
  const target = 0.92 - l * 0.4;
  const k = l > 0.02 ? target / l : 0;
  return k ? hex(rgb.map((v) => v * k) as Rgb) : hex([235, 235, 235]);
}

/** Barva výplně na podkladu: na tmavém se smíchá s podkladem (ztlumí). */
export function fillColor(c: string, paper: Paper): string {
  const rgb = paper === 'dark' ? parse(c) : null;
  const bg = parse(PAPER_BG.dark) as Rgb;
  return rgb ? hex(rgb.map((v, i) => v * 0.45 + (bg[i] as number) * 0.55) as Rgb) : c;
}

/** Primitivum s barvami pro daný podklad (na papíře beze změny). */
export function forPaper(p: Primitive, paper: Paper): Primitive {
  if (paper === 'light') return p;
  if (p.kind === 'line') return { ...p, stroke: { ...p.stroke, color: inkColor(p.stroke.color, paper) } };
  if (p.kind === 'text') return { ...p, color: inkColor(p.color, paper) };
  if (p.kind === 'fill') return { ...p, color: fillColor(p.color, paper) };
  return {
    ...p,
    lineColor: inkColor(p.lineColor, paper),
    fillColor: p.fillColor === null ? null : fillColor(p.fillColor, paper),
  };
}
