// Malé tvary pro motivy šraf (mm na papíře, střed v 0,0, osa y nahoru). Jen pomocníci pro zápis dat.
import { polygon, polyline, smooth, type MotifCurve } from '../types.ts';

/** Kroužek (vyhlazená smyčka z osmi bodů). */
export function ring(cx: number, cy: number, r: number): MotifCurve {
  const pts: [number, number][] = [];
  for (let i = 0; i < 8; i++)
    pts.push([cx + r * Math.cos((i * Math.PI) / 4), cy + r * Math.sin((i * Math.PI) / 4)]);
  return smooth(true, ...pts);
}

/** Trojúhelník špičkou nahoru (r = vzdálenost vrcholu od středu). */
export const tri = (cx: number, cy: number, r: number, rot = 0): MotifCurve => {
  const p = (a: number): [number, number] => [cx + r * Math.sin(a + rot), cy + r * Math.cos(a + rot)];
  return polygon(p(0), p((2 * Math.PI) / 3), p((4 * Math.PI) / 3));
};

/** Úsečka. */
export const seg = (x0: number, y0: number, x1: number, y1: number): MotifCurve =>
  polyline([x0, y0], [x1, y1]);

/** Křížek „+“ (dvě úsečky). */
export const plus = (cx: number, cy: number, r: number): MotifCurve[] => [
  seg(cx - r, cy, cx + r, cy),
  seg(cx, cy - r, cx, cy + r),
];

/** Šestiúhelník špičkou nahoru. */
export function hex(cx: number, cy: number, r: number): MotifCurve {
  const pts: [number, number][] = [];
  for (let i = 0; i < 6; i++)
    pts.push([cx + r * Math.sin((i * Math.PI) / 3), cy + r * Math.cos((i * Math.PI) / 3)]);
  return polygon(...pts);
}
