// Horní profil stěny (plán stěn Z3, rozhodnutí B): rovný, nebo polygon (štít, kolenní zeď).
// Zatím jen data a validace; nástroj a ořez střechou přijdou s etapou střech. Výpočty berou rovný vršek.

/** Bod horního profilu: x = vzdálenost po referenční čáře od začátku, z = výška nad spodkem stěny (mm). */
export interface TopProfilePoint {
  readonly x: number;
  readonly z: number;
}

export type TopProfile =
  { readonly kind: 'flat' } | { readonly kind: 'polygon'; readonly points: readonly TopProfilePoint[] };

export const FLAT_TOP: TopProfile = { kind: 'flat' };

/** Chyba horního profilu, nebo null. Polygon: aspoň 2 body, x rostoucí od 0, z > 0. */
export function topProfileError(p: TopProfile): string | null {
  if (p.kind === 'flat') return null;
  if (p.kind !== 'polygon' || !Array.isArray(p.points)) return 'Neznámý druh horního profilu';
  if (p.points.length < 2) return 'Horní profil potřebuje aspoň 2 body';
  let prev = -Infinity;
  for (const pt of p.points) {
    if (!Number.isFinite(pt.x) || !Number.isFinite(pt.z)) return 'Bod profilu musí mít čísla x a z';
    if (pt.x < 0) return 'Bod profilu nesmí být před začátkem stěny (x ≥ 0)';
    if (!(pt.x > prev)) return 'Body profilu musí jít po stěně za sebou (x roste)';
    if (!(pt.z > 0)) return 'Výška bodu profilu musí být nad spodkem stěny (z > 0)';
    prev = pt.x;
  }
  return null;
}
