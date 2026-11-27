// Výsledný bod pod kurzorem: kandidát přichycení (C střídá) → uzel mřížky (je-li zapnutá) → úhlový krok
// → pomocná čára → volný bod.
// Alt přichytávání vypne (katalog kreslení 2.7); zadané číslo má vždy přednost (řeší volající, 2.5).
import type { Vec2 } from '../geometry/index.ts';
import type { Id } from '../ids/index.ts';
import type { Model } from '../model/types.ts';
import { allWallGeometry, type WallGeometry } from '../wall/geometry.ts';
import { freePoint, snapAngle } from './angle.ts';
import { outlineCorners, snapCandidates } from './candidates.ts';
import { outlineCandidates, outlinePoints, snapOutlines } from './outline-snap.ts';
import type { SnapOptions, SnapResult } from './types.ts';

/** Geometrie stěn podlaží, ke kterým se dá přichytit. */
export function snapGeometry(model: Model, storeyId: Id, exclude?: ReadonlySet<Id>): WallGeometry[] {
  return [...allWallGeometry(model, storeyId).values()].filter((g) => !exclude?.has(g.wallId));
}

/** Přichytí bod; `geoms` lze předat předpočítané (výkon při pohybu myši). */
export function resolveSnap(geoms: readonly WallGeometry[], raw: Vec2, o: SnapOptions): SnapResult {
  if (o.disabled) return { point: raw, snap: null, guides: [] };
  const from = o.from ?? null;
  const ray = { prevDir: o.prevDir ?? null, orthoOnly: o.orthoOnly ?? false };
  const outlines = o.outlines ?? [];
  const extra = outlineCandidates(outlines, geoms, raw, o.tolerance, from);
  const list = snapCandidates(geoms, raw, o.tolerance, from, ray, extra);
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
        ownerId: c.ownerId,
      };
      return { point: c.point, snap, guides: [] };
    }
  }
  const g = o.grid && o.grid > 0 ? o.grid : null;
  if (g) {
    const node = { x: Math.round(raw.x / g) * g, y: Math.round(raw.y / g) * g };
    if (Math.hypot(node.x - raw.x, node.y - raw.y) <= o.tolerance)
      return { point: node, snap: { kind: 'grid', label: 'mřížka', index: 0, count: 1 }, guides: [] };
  }
  const corners = [...outlineCorners(geoms), ...outlinePoints(outlines), ...(o.guidePoints ?? [])];
  if (from) {
    const a = snapAngle(raw, from, o.prevDir ?? null, o.orthoOnly ?? false, corners, o.tolerance);
    if (a) return a;
  }
  return freePoint(raw, from, corners, o.tolerance);
}

/** Zkratka: přichytí bod k modelu podlaží (stěny, desky a otvory v deskách). */
export function snapPoint(model: Model, storeyId: Id, raw: Vec2, o: SnapOptions): SnapResult {
  const outlines = o.outlines ?? snapOutlines(model, storeyId, o.exclude);
  return resolveSnap(snapGeometry(model, storeyId, o.exclude), raw, { ...o, outlines });
}
