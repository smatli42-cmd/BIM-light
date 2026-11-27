// Vzhled povrchu ve 3D z funkce grafiky (základy 11, 30): `surfaceColor` přebarví všechny vrstvy prvku
// (např. bourání žlutě), `surfaceTransparency` 0–100 % ho zprůhlední (bourání 50 %, jako v Revitu).
// null = podle materiálu.
import type { ResolvedEffect } from '@bim-light/core';
import type { Solid } from './solids.ts';

export interface SurfaceLook {
  readonly color: string | null;
  /** Krytí 0–1; null = podle materiálu. */
  readonly opacity: number | null;
}

export const lookOf = (e: Pick<ResolvedEffect, 'surfaceColor' | 'surfaceTransparency'>): SurfaceLook => ({
  color: e.surfaceColor,
  opacity:
    e.surfaceTransparency === null ? null : 1 - Math.min(100, Math.max(0, e.surfaceTransparency)) / 100,
});

export function withLook(solids: Solid[], look: SurfaceLook): Solid[] {
  if (look.color === null && look.opacity === null) return solids;
  return solids.map((s) => ({ ...s, color: look.color ?? s.color, opacity: look.opacity ?? s.opacity }));
}
