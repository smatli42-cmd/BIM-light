// Hrany pro režim Skica (jako ručně kreslené čáry v Arditu): každá úsečka mírně přetáhne přes oba konce
// a konce se nepatrně odchýlí. Odchylka je odvozená ze souřadnic (stejný model = stejná kresba, nebliká).
import type { Segments } from './edges.ts';

/** Přetažení přes konec: 4 % délky, nejméně 40 mm a nejvíc 150 mm. */
export const overshoot = (len: number) => Math.min(150, Math.max(40, len * 0.04));

/** Odchylka konce ±12 mm podle souřadnic (deterministická). */
function wobble(x: number, y: number, z: number): number {
  const h = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453;
  return (h - Math.floor(h) - 0.5) * 24;
}

export function sketchSegments(segs: Segments): Segments {
  const out: Segments = [];
  for (let i = 0; i + 5 < segs.length; i += 6) {
    const [x0, y0, z0, x1, y1, z1] = segs.slice(i, i + 6) as [number, number, number, number, number, number];
    const len = Math.hypot(x1 - x0, y1 - y0, z1 - z0);
    if (len < 1e-6) continue;
    const k = overshoot(len) / len;
    const [dx, dy, dz] = [(x1 - x0) * k, (y1 - y0) * k, (z1 - z0) * k];
    const w0 = wobble(x0, y0, z0);
    const w1 = wobble(x1, y1, z1);
    out.push(x0 - dx + w0, y0 - dy - w0, z0 - dz, x1 + dx + w1, y1 + dy - w1, z1 + dz);
  }
  return out;
}
