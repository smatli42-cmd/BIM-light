// Společné typy a pomůcky náhledu skladby (okno Editor typů, krok 2): plochy vrstev v px a kóty.
import type { Vec2 } from '@bim-light/core';

export type PreviewMode = 'plan' | 'section' | 'iso';

export interface PreviewLayer {
  readonly thickness: number;
  readonly extendTop: number;
  readonly extendBottom: number;
}

/** Plocha vrstvy na plátně: mnohoúhelník (px) a rámec pro šrafu (počátek a směry 1 mm modelu v px). */
export interface PreviewFace {
  readonly layer: number;
  readonly kind: 'cut' | 'top' | 'side';
  readonly poly: readonly Vec2[];
  readonly origin: Vec2;
  readonly ex: Vec2;
  readonly ey: Vec2;
  /** Rozměr plochy v mm modelu (ve směrech ex, ey). */
  readonly size: { readonly w: number; readonly h: number };
}

export interface PreviewDim {
  readonly from: Vec2;
  readonly to: Vec2;
  readonly text: string;
}

export interface PreviewLayout {
  /** Plochy v pořadí kreslení (vzadu první). */
  readonly faces: readonly PreviewFace[];
  readonly refLine: readonly [Vec2, Vec2] | null;
  readonly dims: readonly PreviewDim[];
  /** px na 1 mm modelu. */
  readonly k: number;
}

export const PAD = 18;
export const DIM = 46;
export const v = (x: number, y: number): Vec2 => ({ x, y });
export const offsets = (ls: readonly PreviewLayer[]) => {
  let d = 0;
  return ls.map((l) => {
    const from = d;
    d += l.thickness;
    return from;
  });
};
export const total = (ls: readonly PreviewLayer[]) => ls.reduce((s, l) => s + l.thickness, 0);
export const rect = (x: number, y: number, w: number, h: number): Vec2[] => [
  v(x, y),
  v(x + w, y),
  v(x + w, y + h),
  v(x, y + h),
];

export function face(
  layer: number,
  kind: PreviewFace['kind'],
  poly: Vec2[],
  origin: Vec2,
  ex: Vec2,
  ey: Vec2,
  w: number,
  h: number,
): PreviewFace {
  return { layer, kind, poly, origin, ex, ey, size: { w, h } };
}
