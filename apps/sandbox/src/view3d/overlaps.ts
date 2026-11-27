// Překryvy těles ve 3D (jako priorita průniku v Archicadu): dvě tělesa nesmí zabírat stejný prostor,
// jinak se jejich plochy (hlavně řezné a fasádní) při otáčení střídají – „prolínání“. Těleso s nižší
// prioritou se v místě překryvu vyřízne: stěna má přednost před deskou (obvodová stěna prochází stropem,
// fasáda i zateplení zůstanou souvislé). Tělesa jsou svislé hranoly: pás se rozdělí po výšce podle pásů
// s vyšší prioritou a v každém dílu se odečte jejich půdorys (2D rozdíl). Vše v mm.
import polygonClipping, { type MultiPolygon } from 'polygon-clipping';
import type { Slab } from './slice.ts';
import type { Solid } from './solids.ts';

const EPS = 0.5;

function bbox(shape: MultiPolygon): [number, number, number, number] {
  const pts = shape.flat(2) as unknown as [number, number][];
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
}

const touch = (a: readonly number[], b: readonly number[]) =>
  (a[0] as number) < (b[2] as number) - EPS &&
  (a[2] as number) > (b[0] as number) + EPS &&
  (a[1] as number) < (b[3] as number) - EPS &&
  (a[3] as number) > (b[1] as number) + EPS;

interface Boxed2 {
  readonly slab: Slab;
  readonly box: readonly number[];
}

function minus(shape: MultiPolygon, cut: MultiPolygon[]): MultiPolygon {
  if (!cut.length) return shape;
  try {
    return polygonClipping.difference(shape, ...cut);
  } catch {
    return shape;
  }
}

/** Pás bez částí, které zabírají pásy `over` (vyšší priorita). */
function cutBand(s: Slab, over: readonly Boxed2[]): Slab[] {
  const box = bbox(s.shape);
  const hit = over.filter((o) => o.slab.z0 < s.z1 - EPS && o.slab.z1 > s.z0 + EPS && touch(box, o.box));
  if (!hit.length) return [s];
  const zs = [s.z0, s.z1, ...hit.flatMap((o) => [o.slab.z0, o.slab.z1])]
    .filter((z) => z >= s.z0 && z <= s.z1)
    .sort((a, b) => a - b);
  const out: Slab[] = [];
  for (let i = 0; i + 1 < zs.length; i++) {
    const [z0, z1] = [zs[i] as number, zs[i + 1] as number];
    if (z1 - z0 < EPS) continue;
    const cut = hit.filter((o) => o.slab.z0 <= z0 + EPS && o.slab.z1 >= z1 - EPS).map((o) => o.slab.shape);
    const shape = minus(s.shape, cut);
    if (shape.length) out.push({ z0, z1, shape });
  }
  return out;
}

/** Tělesa bez překryvů: `priority(elementId)` – vyšší číslo vyřízne nižší; stejná priorita se nemění. */
export function resolveOverlaps(solids: readonly Solid[], priority: (id: string) => number): Solid[] {
  const all = solids.map((s) => ({
    p: priority(s.elementId),
    bands: s.slabs.map((slab) => ({ slab, box: bbox(slab.shape) })),
  }));
  return solids.flatMap((s) => {
    const p = priority(s.elementId);
    const over = all.filter((o) => o.p > p).flatMap((o) => o.bands);
    if (!over.length) return [s];
    const slabs = s.slabs.flatMap((b) => cutBand(b, over));
    return slabs.length ? [{ ...s, slabs }] : [];
  });
}
