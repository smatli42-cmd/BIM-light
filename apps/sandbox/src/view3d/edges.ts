// Hrany tělesa vrstvy pro 3D (jako obrysové čáry v Archicadu): obrys spodku a vršku, svislé hrany v rozích
// a na hranici dvou výškových pásů jen to, čím se pásy liší (parapet a nadpraží otvoru), ne čára přes celou
// fasádu. Rozdíl pásů = symetrický rozdíl jejich půdorysů (2D, polygon-clipping). Vše v mm.
import polygonClipping, { type MultiPolygon, type Ring } from 'polygon-clipping';
import type { Slab } from './slice.ts';

/** Úsečky ve 3D jako plochý seznam [x0, y0, z0, x1, y1, z1, …] (mm). */
export type Segments = number[];

/** Svislá hrana jen v rohu ostřejším než tento úhel (°); dílky oblouku hranu nedostanou. */
const CORNER_DEG = 25;

const open = (r: Ring): Ring => {
  const a = r[0];
  const b = r.at(-1);
  return r.length > 1 && a && b && a[0] === b[0] && a[1] === b[1] ? r.slice(0, -1) : r;
};

const rings = (mp: MultiPolygon): Ring[] => mp.flatMap((poly) => poly.map(open));

function ringAt(out: Segments, r: Ring, z: number) {
  r.forEach((p, i) => {
    const q = r[(i + 1) % r.length] as [number, number];
    out.push(p[0], p[1], z, q[0], q[1], z);
  });
}

function isCorner(prev: [number, number], p: [number, number], next: [number, number]): boolean {
  const ax = p[0] - prev[0];
  const ay = p[1] - prev[1];
  const bx = next[0] - p[0];
  const by = next[1] - p[1];
  const turn = Math.abs(Math.atan2(ax * by - ay * bx, ax * bx + ay * by));
  return (turn * 180) / Math.PI > CORNER_DEG;
}

function verticals(out: Segments, s: Slab) {
  for (const r of rings(s.shape)) {
    r.forEach((p, i) => {
      const prev = r[(i - 1 + r.length) % r.length] as [number, number];
      const next = r[(i + 1) % r.length] as [number, number];
      if (isCorner(prev, p, next)) out.push(p[0], p[1], s.z0, p[0], p[1], s.z1);
    });
  }
}

function difference(a: MultiPolygon, b: MultiPolygon): MultiPolygon {
  try {
    return polygonClipping.xor(a, b);
  } catch {
    return [];
  }
}

/** Hrany pásů jedné vrstvy (pásy seřazené zdola, navazující). */
export function slabEdges(slabs: readonly Slab[]): Segments {
  const out: Segments = [];
  const first = slabs[0];
  const last = slabs.at(-1);
  if (!first || !last) return out;
  for (const r of rings(first.shape)) ringAt(out, r, first.z0);
  for (const r of rings(last.shape)) ringAt(out, r, last.z1);
  for (let i = 0; i + 1 < slabs.length; i++) {
    const a = slabs[i] as Slab;
    const b = slabs[i + 1] as Slab;
    for (const r of rings(difference(a.shape, b.shape))) ringAt(out, r, a.z1);
  }
  for (const s of slabs) verticals(out, s);
  return out;
}
