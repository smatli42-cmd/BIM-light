// Stavba oblouku (Z5, nástroj Oblouková stěna a příkaz Zakřivit): třemi body, poloměrem, tečně.
// Výsledek je Path { kind: 'arc', bulge = tan(středový úhel / 4) }; tři body v přímce dají úsečku.
import type { Path } from './path.ts';
import { cross, dist, dot, norm, sub, type Vec2 } from './vec.ts';

const line = (start: Vec2, end: Vec2): Path => ({ kind: 'line', start, end });

/** Oblouk ze začátku přes bod `through` do konce. */
export function arcThrough(start: Vec2, through: Vec2, end: Vec2): Path {
  const turn = cross(sub(through, start), sub(end, through));
  const chord = dist(start, end);
  if (chord < 1e-9 || Math.abs(turn) < 1e-9 * Math.max(1, chord * chord)) return line(start, end);
  // Obvodový úhel: středový úhel = 2 × (π − úhel u bodu `through`), znaménko podle otáčení.
  const a = sub(start, through);
  const b = sub(end, through);
  const inscribed = Math.abs(Math.atan2(cross(a, b), dot(a, b)));
  const sweep = 2 * (Math.PI - inscribed) * Math.sign(turn);
  return { kind: 'arc', start, end, bulge: Math.tan(sweep / 4) };
}

/**
 * Oblouk daného poloměru mezi dvěma body (menší oblouk). Kladný poloměr = střed vlevo od směru
 * start → konec (oblouk proti směru hodin), záporný = vpravo. Krátký poloměr se zvětší na půl tětivy.
 */
export function arcWithRadius(start: Vec2, end: Vec2, radius: number): Path {
  const c = dist(start, end);
  if (!Number.isFinite(radius) || Math.abs(radius) < 1e-9 || c < 1e-9) return line(start, end);
  const r = Math.max(Math.abs(radius), c / 2);
  const sweep = 2 * Math.asin(Math.min(1, c / (2 * r))) * Math.sign(radius);
  return { kind: 'arc', start, end, bulge: Math.tan(sweep / 4) };
}

/** Oblouk, který v začátku pokračuje ve směru `tangent` (tečně na předchozí stěnu) a končí v `end`. */
export function arcTangent(start: Vec2, tangent: Vec2, end: Vec2): Path {
  const t = norm(tangent);
  const chord = sub(end, start);
  const phi = Math.atan2(cross(t, chord), dot(t, chord));
  if (Math.abs(phi) < 1e-9 || Math.abs(Math.abs(phi) - Math.PI) < 1e-9) return line(start, end);
  // Úhel tečny a tětivy = polovina středového úhlu.
  return { kind: 'arc', start, end, bulge: Math.tan(phi / 2) };
}

/** Střed oblouku přes tři body (pro náhled), nebo null u bodů v přímce. */
export function circleCenter(a: Vec2, b: Vec2, c: Vec2): Vec2 | null {
  const d = 2 * cross(sub(b, a), sub(c, a));
  if (Math.abs(d) < 1e-9) return null;
  const ab = dot(sub(b, a), sub(b, a));
  const ac = dot(sub(c, a), sub(c, a));
  const u = sub(b, a);
  const v = sub(c, a);
  const n = { x: v.y * ab - u.y * ac, y: u.x * ac - v.x * ab };
  return { x: a.x + n.x / d, y: a.y + n.y / d };
}
