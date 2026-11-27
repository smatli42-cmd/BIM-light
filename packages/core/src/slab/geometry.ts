// Geometrie desky: plocha a obvod obrysu, kontrola obrysu, výšky horního a spodního líce.
// Vše se počítá z modelu (základ 4); tloušťka = součet vrstev skladby typu.
import { cross, dist, sub, type Vec2 } from '../geometry/index.ts';
import type { Model } from '../model/types.ts';
import { MIN_SLAB_AREA, type Slab } from './types.ts';

/** Plocha se znaménkem (kladná = proti směru hodinových ručiček). */
export function signedArea(pts: readonly Vec2[]): number {
  let s = 0;
  pts.forEach((p, i) => {
    const q = pts[(i + 1) % pts.length] ?? p;
    s += p.x * q.y - q.x * p.y;
  });
  return s / 2;
}

export const polygonArea = (pts: readonly Vec2[]): number => Math.abs(signedArea(pts));

export function polygonPerimeter(pts: readonly Vec2[]): number {
  return pts.reduce((s, p, i) => s + dist(p, pts[(i + 1) % pts.length] ?? p), 0);
}

/** Obrys proti směru hodinových ručiček, bez opakovaného posledního bodu a bez dvojitých bodů. */
export function normalizeOutline(pts: readonly Vec2[]): Vec2[] {
  const out: Vec2[] = [];
  for (const p of pts) {
    const last = out[out.length - 1];
    if (!last || dist(last, p) > 0.1) out.push(p);
  }
  const first = out[0];
  const last = out[out.length - 1];
  if (out.length > 1 && first && last && dist(first, last) <= 0.1) out.pop();
  // Obrácení pořadí zachová první bod (uživatel ho zadal jako první).
  return signedArea(out) < 0 && out[0] ? [out[0], ...out.slice(1).reverse()] : out;
}

/** Protínají se úsečky ab a cd ve vnitřních bodech? (Dotyk v koncovém bodě se nepočítá.) */
function segmentsCross(a: Vec2, b: Vec2, c: Vec2, d: Vec2): boolean {
  const d1 = cross(sub(b, a), sub(c, a));
  const d2 = cross(sub(b, a), sub(d, a));
  const d3 = cross(sub(d, c), sub(a, c));
  const d4 = cross(sub(d, c), sub(b, c));
  return d1 * d2 < 0 && d3 * d4 < 0;
}

/** Chyba obrysu, nebo null: aspoň 3 body, nenulová plocha, hrany se nekříží. */
export function outlineError(pts: readonly Vec2[]): string | null {
  if (pts.length < 3) return 'Obrys desky potřebuje aspoň 3 body';
  const n = pts.length;
  const at = (i: number) => pts[i % n] as Vec2;
  for (let i = 0; i < n; i++) {
    for (let j = i + 2; j < n; j++) {
      if (i === 0 && j === n - 1) continue;
      if (segmentsCross(at(i), at(i + 1), at(j), at(j + 1))) return 'Hrany obrysu desky se kříží';
    }
  }
  return polygonArea(pts) < MIN_SLAB_AREA ? 'Obrys desky má nulovou plochu' : null;
}

/** Tloušťka typu desky = součet vrstev jeho skladby (mm). */
export function slabThickness(model: Model, typeId: string): number {
  const t = model.slabTypes[typeId];
  const c = t ? model.compositions[t.compositionId] : undefined;
  return c ? c.layers.reduce((s, l) => s + l.thickness, 0) : 0;
}

export interface SlabLevels {
  /** Horní líc nad ±0,000 (mm). */
  readonly top: number;
  /** Spodní líc nad ±0,000 (mm). */
  readonly bottom: number;
  readonly thickness: number;
}

export function slabLevels(model: Model, s: Slab): SlabLevels {
  const storey = model.storeys[s.storeyId];
  if (!storey) throw new Error(`Neznámé podlaží ${s.storeyId}`);
  const top = storey.elevation + s.topOffset;
  const thickness = slabThickness(model, s.typeId);
  return { top, bottom: top - thickness, thickness };
}
