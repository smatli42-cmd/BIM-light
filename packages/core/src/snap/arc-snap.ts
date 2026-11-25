// Přichytávání u obloukových stěn (plán stěn Z5): střed oblouku, kvadranty (0°, 90°, 180°, 270°),
// tečna z výchozího bodu a kolmice z výchozího bodu na oblouk. Průsečík přímka–oblouk dávají
// obecné průsečíky líců (candidates.ts).
import { add, arcData, dist, mul, onPath, sub, type Path, type Vec2 } from '../geometry/index.ts';
import type { Id } from '../ids/index.ts';
import type { WallGeometry } from '../wall/geometry.ts';
import type { WallFace } from '../wall/types.ts';
import { candidate } from './candidates.ts';
import type { SnapCandidate } from './types.ts';

type ArcPath = Extract<Path, { kind: 'arc' }>;
const isArc = (p: Path): p is ArcPath => p.kind === 'arc' && Math.abs(p.bulge) > 1e-9;

/** Body dotyku tečen z bodu `q` ke kružnici (prázdné, když bod leží uvnitř). */
export function tangentPoints(c: Vec2, r: number, q: Vec2): Vec2[] {
  const d = dist(c, q);
  if (d <= r + 1e-9) return [];
  const a = Math.atan2(q.y - c.y, q.x - c.x);
  const b = Math.acos(r / d);
  return [a + b, a - b].map((x) => ({ x: c.x + r * Math.cos(x), y: c.y + r * Math.sin(x) }));
}

/** Kvadranty, tečny a kolmice jednoho obloukového líce. */
export function arcFaceCandidates(
  face: Path,
  raw: Vec2,
  tol: number,
  from: Vec2 | null,
  wallId: Id,
  f: WallFace,
): SnapCandidate[] {
  if (!isArc(face)) return [];
  const { center: c, radius: r } = arcData(face);
  const out: SnapCandidate[] = [];
  const keep = (p: Vec2) => dist(p, raw) <= tol && onPath(face, p, 1);
  for (const k of [0, 1, 2, 3]) {
    const p = add(c, mul({ x: Math.cos((k * Math.PI) / 2), y: Math.sin((k * Math.PI) / 2) }, r));
    if (keep(p)) out.push(candidate(p, 'quadrant', wallId, f));
  }
  if (from) {
    for (const p of tangentPoints(c, r, from)) if (keep(p)) out.push(candidate(p, 'tangent', wallId, f));
    const d = dist(c, from);
    if (d > 1e-9) {
      const u = mul(sub(from, c), 1 / d);
      for (const p of [add(c, mul(u, r)), sub(c, mul(u, r))])
        if (keep(p)) out.push(candidate(p, 'perpendicular', wallId, f));
    }
  }
  return out;
}

/** Střed oblouku referenční čáry (jeden pro stěnu). */
export function arcCenter(g: WallGeometry, raw: Vec2, tol: number): SnapCandidate[] {
  if (!isArc(g.path)) return [];
  const c = arcData(g.path).center;
  return dist(c, raw) <= tol ? [candidate(c, 'center', g.wallId)] : [];
}
