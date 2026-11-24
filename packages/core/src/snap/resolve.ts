// Výsledný bod pod kurzorem: kandidát přichycení (C střídá) → úhlový krok → pomocná čára → volný bod.
// Alt přichytávání vypne (katalog kreslení 2.7); zadané číslo má vždy přednost (řeší volající, 2.5).
import type { Vec2 } from '../geometry/index.ts';
import type { Id } from '../ids/index.ts';
import type { Model } from '../model/types.ts';
import { allWallGeometry, type WallGeometry } from '../wall/geometry.ts';
import { freePoint, snapAngle } from './angle.ts';
import { outlineCorners, snapCandidates } from './candidates.ts';
import type { SnapOptions, SnapResult } from './types.ts';

/** Geometrie stěn podlaží, ke kterým se dá přichytit. */
export function snapGeometry(model: Model, storeyId: Id, exclude?: ReadonlySet<Id>): WallGeometry[] {
  return [...allWallGeometry(model, storeyId).values()].filter((g) => !exclude?.has(g.wallId));
}

/** Přichytí bod; `geoms` lze předat předpočítané (výkon při pohybu myši). */
export function resolveSnap(geoms: readonly WallGeometry[], raw: Vec2, o: SnapOptions): SnapResult {
  if (o.disabled) return { point: raw, snap: null, guides: [] };
  const from = o.from ?? null;
  const list = snapCandidates(geoms, raw, o.tolerance, from);
  if (list.length) {
    const i = (((o.cycle ?? 0) % list.length) + list.length) % list.length;
    const c = list[i];
    if (c) {
      const snap = {
        kind: c.kind,
        label: c.label,
        index: i,
        count: list.length,
        wallId: c.wallId,
        face: c.face,
      };
      return { point: c.point, snap, guides: [] };
    }
  }
  const corners = outlineCorners(geoms);
  if (from) {
    const a = snapAngle(raw, from, o.prevDir ?? null, o.orthoOnly ?? false, corners, o.tolerance);
    if (a) return a;
  }
  return freePoint(raw, from, corners, o.tolerance);
}

/** Zkratka: přichytí bod k modelu podlaží. */
export function snapPoint(model: Model, storeyId: Id, raw: Vec2, o: SnapOptions): SnapResult {
  return resolveSnap(snapGeometry(model, storeyId, o.exclude), raw, o);
}
