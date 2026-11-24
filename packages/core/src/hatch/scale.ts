// Měřítko šraf stylu (katalog šraf): jedno číslo násobí všechny rozměry šrafy najednou – rozteče,
// čárkování, velikosti značek, vlny i body motivů. Tvar (úhly, poměry) zůstane stejný.
import type { Hatch, HatchFamily } from './types.ts';

/** Povolený rozsah měřítka šraf ve stylu. */
export const HATCH_SCALE_MIN = 0.5;
export const HATCH_SCALE_MAX = 3;

function scaleFamily(f: HatchFamily, k: number): HatchFamily {
  switch (f.kind) {
    case 'lines':
      return {
        ...f,
        spacing: f.spacing * k,
        offset: f.offset * k,
        dash: f.dash.map((d) => d * k),
        ...(f.shift ? { shift: f.shift * k } : {}),
      };
    case 'marks':
      return { ...f, size: f.size * k, dx: f.dx * k, dy: f.dy * k, rowShift: f.rowShift * k };
    case 'wave':
      return { ...f, amplitude: f.amplitude * k, wavelength: f.wavelength * k, spacing: f.spacing * k };
    case 'motif':
      return {
        ...f,
        dx: f.dx * k,
        dy: f.dy * k,
        rowShift: f.rowShift * k,
        curves: f.curves.map((c) => ({ ...c, points: c.points.map((p) => ({ x: p.x * k, y: p.y * k })) })),
      };
  }
}

/** Šrafa zvětšená k-krát (k = 1 vrátí tutéž šrafu). */
export function scaleHatch(h: Hatch, k: number): Hatch {
  if (k === 1) return h;
  return { ...h, families: h.families.map((f) => scaleFamily(f, k)) };
}
