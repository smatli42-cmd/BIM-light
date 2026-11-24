// Kde leží bod vůči referenční čáře: kladné = vlevo od směru kreslení (mm).
import { arcData, cross, dist, norm, sub, type Path, type Vec2 } from '../geometry/index.ts';

export function leftOffsetOf(path: Path, p: Vec2): number {
  if (path.kind === 'line' || Math.abs(path.bulge) < 1e-9) {
    return cross(norm(sub(path.end, path.start)), sub(p, path.start));
  }
  const a = arcData(path);
  const r = dist(p, a.center);
  return a.sweep > 0 ? a.radius - r : r - a.radius;
}
