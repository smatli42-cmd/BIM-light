// 2D barvy materiálu odvozené z jeho barvy (katalog šraf: výplň světlá, čáry tmavé), pokud nejsou
// u materiálu přepsané. Odvození: výplň = 65 % cesty k bílé, čáry = 70 % cesty k černé (k potvrzení).
import type { Material } from './types.ts';

function parseHex(c: string): [number, number, number] | null {
  const m = /^#([0-9a-f]{6})$/i.exec(c.trim());
  if (!m?.[1]) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const toHex = (rgb: readonly number[]) =>
  `#${rgb
    .map((v) =>
      Math.round(Math.min(255, Math.max(0, v)))
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`;

/** Smíchá barvu s cílovou (0 = beze změny, 1 = cíl). */
export function mixColor(color: string, target: number, t: number): string {
  const rgb = parseHex(color);
  if (!rgb) return color;
  return toHex(rgb.map((v) => v + (target - v) * t));
}

export const FILL_TO_WHITE = 0.65;
export const LINES_TO_BLACK = 0.7;

/** Barva výplně řezu v 2D (přepsaná, nebo odvozená světlá). */
export const materialFill = (m: Material): string => m.fillColor ?? mixColor(m.color, 255, FILL_TO_WHITE);

/** Barva čar šrafy v 2D (přepsaná, nebo odvozená tmavá). */
export const materialLines = (m: Material): string => m.lineColor ?? mixColor(m.color, 0, LINES_TO_BLACK);
