// Poloha po referenční čáře stěny (vzdálenost od začátku v mm) ↔ bod v půdorysu (základ 23: úsečka
// i oblouk). U oblouku je vzdálenost délka oblouku a příčný směr míří ke středu / od středu.
import {
  add,
  arcData,
  leftNormal,
  mul,
  norm,
  paramOf,
  pathLength,
  pointAt,
  sub,
  tangentAt,
  type Path,
  type Vec2,
} from '../geometry/index.ts';

export interface Station {
  /** Bod na referenční čáře. */
  readonly point: Vec2;
  /** Směr kreslení v tomto místě. */
  readonly tangent: Vec2;
  /** Levá normála (kladné offsety vrstev). */
  readonly normal: Vec2;
}

const isArc = (p: Path) => p.kind === 'arc' && Math.abs(p.bulge) > 1e-9;

/** Místo na referenční čáře ve vzdálenosti `s` od začátku (smí ležet i na prodloužení úsečky). */
export function stationAt(path: Path, s: number): Station {
  const len = pathLength(path);
  if (!isArc(path)) {
    const t = tangentAt(path, 'start');
    return { point: add(path.start, mul(t, s)), tangent: t, normal: leftNormal(t) };
  }
  const point = pointAt(path, s / len);
  const a = arcData(path as Extract<Path, { kind: 'arc' }>);
  const r = norm(sub(point, a.center));
  const tangent = a.sweep > 0 ? leftNormal(r) : mul(leftNormal(r), -1);
  return { point, tangent, normal: leftNormal(tangent) };
}

/** Bod v offsetu `o` (doleva od směru kreslení) ve vzdálenosti `s`. */
export function pointAtStation(path: Path, s: number, o: number): Vec2 {
  const st = stationAt(path, s);
  return add(st.point, mul(st.normal, o));
}

/** Vzdálenost průmětu bodu od začátku referenční čáry (mm, mimo křivku i záporná / větší než délka). */
export const lengthAt = (path: Path, q: Vec2): number => paramOf(path, q) * pathLength(path);
