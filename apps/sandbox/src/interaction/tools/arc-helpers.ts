// Pomocníci nástroje Oblouková stěna (Z5): náhled pásu, strana kurzoru, napsaná čísla, údaje
// trackeru a přichycení bodu oblouku na kružnici sousedního oblouku.
import {
  arcData,
  cross,
  dist,
  offsetPath,
  parseNumber,
  sub,
  tessellate,
  type Path,
  type Vec2,
} from '@bim-light/core';
import type { Session } from '../../session/session.ts';
import { typeThickness } from './wall-links.ts';

/** +1 = bod `q` leží vlevo od směru `dir` z bodu `a`, −1 = vpravo. */
export const sideOf = (a: Vec2, dir: Vec2, q: Vec2): 1 | -1 => (cross(dir, sub(q, a)) >= 0 ? 1 : -1);

export function arcGhost(s: Session, path: Path): Vec2[] {
  const t = typeThickness(s.model, s.wallTypeId);
  const signed = s.wallSide === 'left' ? t : -t;
  const back = s.wallRefLine === 'axis' ? -signed / 2 : s.wallRefLine === 'opp-face' ? -signed : 0;
  const a = tessellate(offsetPath(path, back));
  const b = tessellate(offsetPath(path, back + signed));
  return [...a, ...b.reverse()];
}

/** Napsané kladné číslo, jinak null (prázdné = podle myši). */
export function positive(text: string): number | null {
  const n = parseNumber(text);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Poloměr a středový úhel pro tracker. */
export function arcInfo(p: Path): { radius: string; sweep: string } {
  if (p.kind !== 'arc' || Math.abs(p.bulge) < 1e-9) return { radius: '∞', sweep: '0°' };
  const sweep = Math.abs(4 * Math.atan(p.bulge));
  const radius = dist(p.start, p.end) / 2 / Math.sin(sweep / 2);
  const deg = String(Math.round((sweep * 1800) / Math.PI) / 10).replace('.', ',');
  return { radius: String(Math.round(radius)), sweep: `${deg}°` };
}

/**
 * Kružnice existujícího oblouku, která prochází začátkem i koncem nového oblouku (do 0,5 mm) a leží
 * u kurzoru (do `tol`): bod oblouku se na ni přichytí. Kruh ze dvou oblouků tak má jednu kružnici
 * a v uzlech se napojí bez švu.
 */
export function circleSnap(s: Session, a: Vec2, b: Vec2, q: Vec2, tol: number): Vec2 | null {
  for (const w of Object.values(s.model.elements)) {
    const p = w.path;
    if (w.storeyId !== s.storeyId || p.kind !== 'arc' || Math.abs(p.bulge) < 1e-9) continue;
    const { center: c, radius: r } = arcData(p);
    if (Math.abs(dist(a, c) - r) > 0.5 || Math.abs(dist(b, c) - r) > 0.5) continue;
    const d = dist(q, c);
    if (d < 1e-9 || Math.abs(d - r) > tol) continue;
    return { x: c.x + ((q.x - c.x) * r) / d, y: c.y + ((q.y - c.y) * r) / d };
  }
  return null;
}
