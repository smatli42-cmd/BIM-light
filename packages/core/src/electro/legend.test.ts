import { describe, expect, it } from 'vitest';
import { GLYPHS } from './glyphs.ts';
import { LEGEND_UNIT } from './legend.ts';
import { LEGEND_ROWS } from './legend-order.ts';
import { ELECTRO_LIBRARY } from './library.ts';
import type { SymbolShape } from './types.ts';

/**
 * Rozměry kresby značek v legendě uživatele (Corel SVG, jednotka 0,01 mm, bez tloušťky čar) a druhy
 * primitiv: šířka, výška, počty druhů (line = úsečka i lomená čára / obdélník).
 */
const EXPECTED: Record<string, [w: number, h: number, kinds: string]> = {
  socket: [340, 340, 'arc 1, line 2'],
  outlet1f: [340, 340, 'line 3'],
  outlet3f: [340, 340, 'line 3'],
  wallbox: [340, 238, 'line 1, text 1'],
  fan: [408, 238, 'circle 2, line 1'],
  switch1: [398.4, 459.95, 'circle 1, line 1'],
  switch6: [380.6, 460, 'circle 1, line 2'],
  switch5: [460, 358.3, 'circle 1, line 2'],
  dimmer: [412.2, 459.95, 'circle 1, line 2'],
  lamp: [374, 374, 'circle 1, line 2'],
  'lamp-surface': [272, 272, 'circle 1, line 2'],
  'lamp-pendant': [272, 272, 'circle 2, disc 1, line 2'],
  'lamp-outdoor': [346.8, 298.1, 'arc 1, circle 1, line 2'],
  'lamp-sensor': [391.6, 391.6, 'arc 2, circle 1, line 2'],
  data: [340, 340, 'line 3'],
  wifi: [384.7, 292.4, 'arc 3, circle 1, disc 1'],
  tv: [340, 340, 'line 3'],
  videophone: [340, 238, 'circle 1, line 1'],
  blind: [340, 340, 'line 4'],
  smoke: [272, 272, 'circle 1, text 1'],
  co: [306, 306, 'circle 1, text 1'],
  contact: [272, 204, 'line 1, text 1'],
  siren: [306, 272, 'line 1'],
  keypad: [272, 272, 'circle 4, disc 4, line 1'],
  'alarm-panel': [408, 272, 'line 1, text 1'],
  'camera-ceiling': [272, 272, 'circle 1, fill 1, line 1'],
  'camera-wall': [238, 306, 'line 3'],
  bell: [272, 306, 'arc 1, circle 1, disc 1, line 2'],
  thermostat: [272, 272, 'line 1, text 1'],
};

/** Body obrysu tvaru (oblouky po stupních) – přesná obálka bez textu. */
function points(s: SymbolShape): { x: number; y: number }[] {
  if (s.kind === 'line' || s.kind === 'fill') return [...s.points];
  if (s.kind === 'text') return [];
  const [from, to] = s.kind === 'arc' ? [s.from, s.to] : [0, 360];
  return Array.from({ length: Math.ceil(to - from) + 1 }, (_, i) => {
    const a = ((from + i) * Math.PI) / 180;
    return { x: s.center.x + s.r * Math.cos(a), y: s.center.y + s.r * Math.sin(a) };
  });
}

function measure(key: string) {
  const shapes = GLYPHS[key]?.shapes ?? [];
  const pts = shapes.flatMap(points);
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const counts = new Map<string, number>();
  for (const s of shapes) counts.set(s.kind, (counts.get(s.kind) ?? 0) + 1);
  const kinds = [...counts]
    .sort()
    .map(([k, n]) => `${k} ${n}`)
    .join(', ');
  return {
    w: (Math.max(...xs) - Math.min(...xs)) * LEGEND_UNIT,
    h: (Math.max(...ys) - Math.min(...ys)) * LEGEND_UNIT,
    y0: Math.min(...ys),
    kinds,
  };
}

const mountOf = (key: string) => ELECTRO_LIBRARY.find((i) => i.key === key)?.mount;

describe('legenda uživatele (Corel SVG): tvary značek', () => {
  it.each(Object.entries(EXPECTED))(
    'legenda uživatele: %s – rozměry a druhy primitiv jako v legendě',
    (key, e) => {
      const m = measure(key);
      expect(m.w).toBeCloseTo(e[0], 0);
      expect(m.h).toBeCloseTo(e[1], 0);
      expect(m.kinds).toBe(e[2]);
    },
  );

  it('legenda uživatele: značka na stěnu začíná na líci (y = 0), značka na strop má střed v počátku', () => {
    for (const key of Object.keys(EXPECTED)) {
      const m = measure(key);
      if (mountOf(key) === 'wall') expect(m.y0, key).toBeCloseTo(0, 3);
      else if (mountOf(key) === 'ceiling') expect(m.y0, key).toBeLessThan(0);
    }
  });

  it('legenda uživatele: každý řádek legendy má typ v knihovně a popis typu je text legendy', () => {
    for (const [key, text] of LEGEND_ROWS) {
      expect(ELECTRO_LIBRARY.find((i) => i.key === key)?.description, key).toBe(text);
    }
    const glyphRows = LEGEND_ROWS.filter(
      ([k]) => !['board-main', 'board-data', 'lamp-linear', 'led-strip'].includes(k),
    );
    expect(glyphRows.filter(([k]) => !EXPECTED[k])).toEqual([]);
  });

  it('legenda uživatele: velikost – zásuvka 3,4 mm na papíře při značce 4 mm (jednotka = 4 mm)', () => {
    expect(measure('socket').w / LEGEND_UNIT).toBeCloseTo(0.85, 3);
  });
});
