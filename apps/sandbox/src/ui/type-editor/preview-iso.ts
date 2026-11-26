// Pseudo-3D výsek stěny (okno Editor typů, krok 2): izometrie (bez perspektivy) úseku stěny, vrstvy
// odstupňované jako schody – vnitřní (u referenční strany) nejdelší, vnější nejkratší, takže je vidět čelo
// (řez se šrafou), horní plocha i líc každé vrstvy. Pohled ze strany +délka, +tloušťka, shora.
import type { Vec2 } from '@bim-light/core';
import {
  face,
  offsets,
  PAD,
  total,
  v,
  type PreviewFace,
  type PreviewLayer,
  type PreviewLayout,
} from './preview-types.ts';

const C = Math.cos(Math.PI / 6);
const S = 0.5;

/** Izometrie: délka u, hloubka d (od referenční strany), výška z → body v mm (osa y dolů). */
const project = (u: number, d: number, z: number): Vec2 => v((u - d) * C, (u + d) * S - z);

interface Raw {
  readonly layer: number;
  readonly kind: PreviewFace['kind'];
  readonly pts: Vec2[];
  readonly w: number;
  readonly h: number;
}

function rawFaces(ls: readonly PreviewLayer[]): Raw[] {
  const t = total(ls);
  const L = Math.max(1500, 4 * t);
  const h = 0.45 * L;
  const n = ls.length;
  const step = n > 1 ? Math.min(0.18 * L, (0.55 * L) / (n - 1)) : 0;
  const d0 = offsets(ls);
  return ls.flatMap((l, i) => layerFaces(i, d0[i] ?? 0, l.thickness, L - i * step, h));
}

/** Plochy jedné vrstvy: hloubka a..a+t, délka 0..ue, výška 0..h. */
function layerFaces(i: number, a: number, t: number, ue: number, h: number): Raw[] {
  const b = a + t;
  return [
    {
      layer: i,
      kind: 'side',
      pts: [
        [0, b, 0],
        [ue, b, 0],
        [ue, b, h],
        [0, b, h],
      ],
      w: ue,
      h,
    },
    {
      layer: i,
      kind: 'top',
      pts: [
        [0, a, h],
        [ue, a, h],
        [ue, b, h],
        [0, b, h],
      ],
      w: ue,
      h: t,
    },
    // Čelo: počátek vlevo nahoře (u referenční strany, nahoře), ex = tloušťka, ey = dolů.
    {
      layer: i,
      kind: 'cut',
      pts: [
        [ue, a, h],
        [ue, b, h],
        [ue, b, 0],
        [ue, a, 0],
      ],
      w: t,
      h,
    },
  ].map((f) => ({ ...f, pts: f.pts.map(([u, d, z]) => project(u ?? 0, d ?? 0, z ?? 0)) }) as Raw);
}

export function iso(ls: readonly PreviewLayer[], W: number, H: number): PreviewLayout {
  const raw = rawFaces(ls);
  const all = raw.flatMap((f) => f.pts);
  const xs = all.map((p) => p.x);
  const ys = all.map((p) => p.y);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const k = Math.min((W - 2 * PAD) / (x1 - x0), (H - 2 * PAD) / (y1 - y0));
  const ox = (W - (x1 - x0) * k) / 2 - x0 * k;
  const oy = (H - (y1 - y0) * k) / 2 - y0 * k;
  const map = (p: Vec2) => v(ox + p.x * k, oy + p.y * k);
  const faces = raw.map((f) => {
    const poly = f.pts.map(map);
    const [p0, p1, , p3] = poly as [Vec2, Vec2, Vec2, Vec2];
    const ex = v((p1.x - p0.x) / f.w, (p1.y - p0.y) / f.w);
    const ey = v((p3.x - p0.x) / f.h, (p3.y - p0.y) / f.h);
    return face(f.layer, f.kind, poly, p0, ex, ey, f.w, f.h);
  });
  return { faces, refLine: null, dims: [], k };
}
