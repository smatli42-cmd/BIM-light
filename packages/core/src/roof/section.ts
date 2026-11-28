// Střecha v řezu a pohledu (rozhodnutí 19, S1): tělesa vrstev (solids.ts) proříznutá svislou rovinou řezu
// = plochy (u, z) po vrstvách se šrafou materiálu; roviny za řezem do hloubky pohledu = horní líc promítnutý
// na rovinu výkresu (pohledové hrany, zakrývání). Jen výpočet, nic se neukládá.
import { clipRect, planePolygon, rect, type PlanePolygon } from '../covering/polygon.ts';
import type { Vec3 } from '../covering/frame.ts';
import type { Vec2 } from '../geometry/index.ts';
import type { Model } from '../model/types.ts';
import type { CutPiece } from '../section/cut.ts';
import { cropToRange } from '../section/cut.ts';
import { atFrame, partZone, toFrame, type SectionFrame } from '../section/frame.ts';
import type { Projected } from '../section/projection.ts';
import type { SectionRange } from '../section/types.ts';
import { planeZ, roofGeometry } from './planes.ts';
import { roofLayerOffsets, roofLayers } from './queries.ts';
import { roofSolids, solidTriangles } from './solids.ts';
import type { Roof } from './types.ts';

const BIG = 1e7;
const key = (p: Vec2) => `${p.x.toFixed(3)}|${p.y.toFixed(3)}`;
const less = (a: Vec3, b: Vec3) => a.x < b.x || (a.x === b.x && (a.y < b.y || (a.y === b.y && a.z < b.z)));

/** Úsečky průniku trojúhelníků s rovinou d = d0 v souřadnicích výkresu (u, z). */
function sliceSegments(f: SectionFrame, tris: readonly [Vec3, Vec3, Vec3][], d0: number): [Vec2, Vec2][] {
  const s = (p: Vec3) => toFrame(f, p).d - d0;
  const hit = (a: Vec3, b: Vec3): Vec2 | null => {
    const [p, q] = less(a, b) ? [a, b] : [b, a];
    const sp = s(p);
    const sq = s(q);
    if (sp > 0 === sq > 0) return null;
    const t = sp / (sp - sq);
    const x = { x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t };
    return { x: toFrame(f, x).u, y: p.z + (q.z - p.z) * t };
  };
  return tris.flatMap(([a, b, c]) => {
    const pts = [hit(a, b), hit(b, c), hit(c, a)].filter((x): x is Vec2 => !!x);
    return pts.length === 2 ? [[pts[0], pts[1]] as [Vec2, Vec2]] : [];
  });
}

/** Spojí úsečky do uzavřených smyček podle shodných konců. */
function chain(segs: readonly [Vec2, Vec2][]): Vec2[][] {
  const by = new Map<string, number[]>();
  segs.forEach(([a, b], i) => {
    for (const p of [a, b]) by.set(key(p), [...(by.get(key(p)) ?? []), i]);
  });
  const used = new Set<number>();
  const loops: Vec2[][] = [];
  segs.forEach(([a0, b0], i) => {
    if (used.has(i)) return;
    used.add(i);
    const loop = [a0];
    let cur = b0;
    for (let g = 0; g < segs.length && key(cur) !== key(a0); g++) {
      loop.push(cur);
      const next = (by.get(key(cur)) ?? []).find((j) => !used.has(j));
      if (next === undefined) break;
      used.add(next);
      const [a, b] = segs[next] as [Vec2, Vec2];
      cur = key(a) === key(cur) ? b : a;
    }
    if (loop.length >= 3) loops.push(loop);
  });
  return loops;
}

/** Řezané vrstvy střechy (stejné jako CutPiece stěn a desek: materiál, plochy, pás pro šrafu). */
export function roofCut(model: Model, roof: Roof, f: SectionFrame, range: SectionRange | null): CutPiece[] {
  const geo = roofGeometry(model, roof);
  const D = roofLayerOffsets(roofLayers(model, roof));
  return roofSolids(model, roof, geo).flatMap((s) => {
    const tris = solidTriangles(s);
    const plane = geo.planes.find((p) => p.edge === s.plane);
    return f.parts.flatMap((part) => {
      const loops = chain(sliceSegments(f, tris, part.d0 + 1e-3));
      const all = loops.flatMap((l) => planePolygon(l));
      const shapes = cropToRange(clipRect(all, rect(part.u0, -BIG, part.u1, BIG)), range);
      if (!shapes.length || !plane) return [];
      const us = shapes.flatMap((p) => p.outer.map((q) => q.x));
      const [u0, u1] = [Math.min(...us), Math.max(...us)];
      const sec = 1 / plane.normal.z;
      const zAt = (u: number) => planeZ(geo, s.plane, atFrame(f, u, part.d0)) + (D[s.layer] ?? 0) * sec;
      const [z0, z1] = [zAt(u0), zAt(u1)];
      const tv = ((D[s.layer + 1] ?? 0) - (D[s.layer] ?? 0)) * sec;
      const cos = (u1 - u0) / (Math.hypot(u1 - u0, z1 - z0) || 1);
      return [
        {
          elementId: roof.id,
          materialId: s.materialId,
          core: s.core,
          shapes,
          band: {
            path: { kind: 'line', start: { x: u0, y: z0 }, end: { x: u1, y: z1 } },
            sideA: 0,
            sideB: tv * cos,
            extend: 0,
          },
        } satisfies CutPiece,
      ];
    });
  });
}

/** Roviny střechy za řezem do hloubky pohledu: horní líc promítnutý na rovinu výkresu (jedna plocha na rovinu). */
export function roofProjection(
  model: Model,
  roof: Roof,
  f: SectionFrame,
  range: SectionRange | null,
): Projected[] {
  const geo = roofGeometry(model, roof);
  const top = roofLayerOffsets(roofLayers(model, roof)).at(-1) ?? 0;
  return geo.planes.flatMap((p) => {
    const plan = planePolygon(p.polygon);
    const sec = 1 / p.normal.z;
    return f.parts.flatMap((part) => {
      const inZone: PlanePolygon[] = clipRect(plan, partZone(f, part));
      const pts = inZone.flatMap((z) => z.outer);
      if (!pts.length) return [];
      const shapes = cropToRange(
        inZone.flatMap((z) =>
          planePolygon(z.outer.map((q) => ({ x: toFrame(f, q).u, y: planeZ(geo, p.edge, q) + top * sec }))),
        ),
        range,
      );
      if (!shapes.length) return [];
      const depth = Math.max(0, Math.min(...pts.map((q) => toFrame(f, q).d - part.d0)));
      return [{ elementId: roof.id, depth, shapes }];
    });
  });
}
