// Hrany obrysu střechy jako přímky: směr, normála dovnitř, poloha, sklon (tg), přesah, štít a polovalba.
import { dist, dot, norm, sub, type Vec2 } from '../geometry/index.ts';
import type { Roof } from './types.ts';

export interface EdgeLine {
  readonly a: Vec2;
  readonly b: Vec2;
  readonly d: Vec2;
  /** Normála dovnitř střechy (obrys je proti směru hodin). */
  readonly n: Vec2;
  /** n · bod na přímce. */
  readonly c: number;
  readonly slope: number;
  /** tg sklonu (štít 0 – rovina se nepočítá). */
  readonly tan: number;
  readonly overhang: number;
  /** Svislá spodní část: štít, nebo polovalba (štít do výšky zlomu). */
  readonly gable: boolean;
  /** Polovalba: štít do výšky zlomu `lift`, nad ním valba se sklonem `slope`. */
  readonly halfhip: boolean;
  /** Výška roviny nad ref. čárou na přímce hrany (polovalba = výška zlomu, jinak 0). */
  readonly lift: number;
  /** Leží bod na úsečce hrany (tolerance 0,5 mm)? */
  readonly contains: (q: Vec2) => boolean;
}

export function roofEdgeLines(roof: Pick<Roof, 'outline' | 'edges'>): EdgeLine[] {
  const pts = roof.outline;
  return pts.map((a, i) => {
    const b = pts[(i + 1) % pts.length] as Vec2;
    const d = norm(sub(b, a));
    const n = { x: -d.y, y: d.x };
    const e = roof.edges[i];
    const halfhip = e?.kind === 'halfhip';
    const gable = e?.kind === 'gable' || halfhip;
    const slope = e?.slope ?? 0;
    const len = dist(a, b);
    return {
      a,
      b,
      d,
      n,
      c: dot(n, a),
      slope,
      tan: gable && !halfhip ? 0 : Math.tan((slope * Math.PI) / 180),
      overhang: e?.overhang ?? 0,
      gable,
      halfhip,
      lift: halfhip ? (e?.breakHeight ?? 0) : 0,
      contains: (q: Vec2) => {
        const s = dot(sub(q, a), d);
        return Math.abs(dot(sub(q, a), n)) < 0.5 && s > -0.5 && s < len + 0.5;
      },
    };
  });
}
