// Přední líc svislého prvku v pohledu (skryté hrany, hlášení uživatele 2026-11-28): hloubka prvku se mění
// po šířce výkresu – stěna viděná z boku začíná v líci fasády a pokračuje do hloubky. Pro zakrývání se proto
// porovnává hloubka předního líce v místě u (nejmenší d průniku svislé přímky u s půdorysem v pásmu pohledu),
// ne jen nejbližší bod celého prvku.
import { clipRect, type PlanePolygon } from '../covering/polygon.ts';
import { partZone, toFrame, type SectionFrame } from './frame.ts';

/** Bod půdorysu v souřadnicích výkresu: u po čáře, d za rovinou svého úseku. */
export interface FramePoint {
  readonly u: number;
  readonly d: number;
}

/** Části půdorysu v pásmu pohledu jako smyčky (u, d). */
export function zoneRings(f: SectionFrame, plan: readonly PlanePolygon[]): FramePoint[][] {
  return f.parts.flatMap((part) =>
    clipRect(plan, partZone(f, part)).map((p) =>
      p.outer.map((q) => {
        const r = toFrame(f, q);
        return { u: r.u, d: r.d - part.d0 };
      }),
    ),
  );
}

/** Hloubka předního líce v místě u (Infinity = prvek tu není). */
export type FrontDepth = (u: number) => number;

export function frontDepth(rings: readonly FramePoint[][]): FrontDepth {
  return (u) => {
    let best = Number.POSITIVE_INFINITY;
    for (const r of rings)
      r.forEach((p, i) => {
        const q = r[(i + 1) % r.length] as FramePoint;
        if ((p.u - u) * (q.u - u) > 0) return;
        const d =
          Math.abs(q.u - p.u) < 1e-9 ? Math.min(p.d, q.d) : p.d + ((q.d - p.d) * (u - p.u)) / (q.u - p.u);
        best = Math.min(best, Math.max(0, d));
      });
    return best;
  };
}
