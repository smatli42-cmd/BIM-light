// Rozložení náhledu skladby v okně Editor typů (krok 2, koncepce rozhraní 11a): půdorys (stěna vodorovně,
// vrstvy jako pásy), řez (stěna nastojato, vrstvy svisle i s prodloužením nahoru / dolů) a pseudo-3D
// výsek s vrstvami odstupňovanými jako schody. Vše ve skutečném poměru; čistá funkce bez plátna (testy).
import type { Vec2 } from '@bim-light/core';
import { iso } from './preview-iso.ts';
import {
  DIM,
  face,
  offsets,
  PAD,
  rect,
  total,
  v,
  type PreviewDim,
  type PreviewFace,
  type PreviewLayer,
  type PreviewLayout,
  type PreviewMode,
} from './preview-types.ts';

export type { PreviewDim, PreviewFace, PreviewLayer, PreviewLayout, PreviewMode } from './preview-types.ts';

/** Kótovací řetěz tlouštěk (jen vrstvy, které jsou na plátně aspoň 12 px) a celková tloušťka. */
function chain(ls: readonly PreviewLayer[], at: (d: number) => Vec2, k: number, shift: Vec2): PreviewDim[] {
  const d0 = offsets(ls);
  const out: PreviewDim[] = ls.flatMap((l, i) =>
    l.thickness * k >= 12
      ? [{ from: at(d0[i] ?? 0), to: at((d0[i] ?? 0) + l.thickness), text: String(l.thickness) }]
      : [],
  );
  const t = total(ls);
  const a = at(0);
  const b = at(t);
  out.push({ from: v(a.x + shift.x, a.y + shift.y), to: v(b.x + shift.x, b.y + shift.y), text: String(t) });
  return out;
}

/** Půdorys: úsek stěny vodorovně, referenční (vnitřní) strana dole, kóty tlouštěk vpravo. */
function plan(ls: readonly PreviewLayer[], ref: number, W: number, H: number): PreviewLayout {
  const t = total(ls);
  const L = Math.max(1200, 2.5 * t);
  const k = Math.min((W - 2 * PAD - DIM) / L, (H - 2 * PAD) / t);
  const x0 = (W - DIM - L * k) / 2;
  const yb = (H + t * k) / 2;
  const d0 = offsets(ls);
  const faces = ls.map((l, i) => {
    const y = yb - ((d0[i] ?? 0) + l.thickness) * k;
    return face(i, 'cut', rect(x0, y, L * k, l.thickness * k), v(x0, y), v(k, 0), v(0, k), L, l.thickness);
  });
  const xr = x0 + L * k + 12;
  const dims = chain(ls, (d) => v(xr, yb - d * k), k, v(20, 0));
  const yr = yb - ref * k;
  return { faces, refLine: [v(x0 - 8, yr), v(x0 + L * k + 8, yr)], dims, k };
}

/** Řez: stěna nastojato, referenční strana vlevo, vrstvy i s prodloužením nahoru / dolů. */
function section(ls: readonly PreviewLayer[], ref: number, W: number, H: number): PreviewLayout {
  const t = total(ls);
  const hs = Math.max(1000, 2.5 * t);
  const top = Math.max(0, ...ls.map((l) => l.extendTop));
  const bot = Math.max(0, ...ls.map((l) => l.extendBottom));
  const k = Math.min((W - 2 * PAD) / t, (H - 2 * PAD - DIM) / (hs + top + bot));
  const x0 = (W - t * k) / 2;
  const yTop = (H - DIM - (hs + top + bot) * k) / 2 + top * k;
  const d0 = offsets(ls);
  const faces = ls.map((l, i) => {
    const x = x0 + (d0[i] ?? 0) * k;
    const y = yTop - l.extendTop * k;
    const h = hs + l.extendTop + l.extendBottom;
    return face(i, 'cut', rect(x, y, l.thickness * k, h * k), v(x, y), v(k, 0), v(0, k), l.thickness, h);
  });
  const yd = yTop + (hs + bot) * k + 12;
  const dims = chain(ls, (d) => v(x0 + d * k, yd), k, v(0, 20));
  const xr = x0 + ref * k;
  return { faces, refLine: [v(xr, yTop - top * k - 8), v(xr, yTop + (hs + bot) * k + 8)], dims, k };
}

export function previewLayout(
  mode: PreviewMode,
  ls: readonly PreviewLayer[],
  ref: number,
  W: number,
  H: number,
): PreviewLayout {
  if (total(ls) <= 0) return { faces: [], refLine: null, dims: [], k: 1 };
  if (mode === 'section') return section(ls, ref, W, H);
  if (mode === 'iso') return iso(ls, W, H);
  return plan(ls, ref, W, H);
}

/** Vrstva pod bodem (nejvrchnější nakreslená plocha), nebo null. */
export function layerAt(layout: PreviewLayout, p: Vec2): number | null {
  for (let i = layout.faces.length - 1; i >= 0; i--) {
    const f = layout.faces[i] as PreviewFace;
    if (inside(f.poly, p)) return f.layer;
  }
  return null;
}

function inside(poly: readonly Vec2[], p: Vec2): boolean {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i] as Vec2;
    const b = poly[j] as Vec2;
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) c = !c;
  }
  return c;
}
