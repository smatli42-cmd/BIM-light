// Náhled obloukové stěny (Z5): pás mezi soustřednými oblouky v tloušťce typu, na stranu podle
// mezerníku; u osy leží nakreslená čára uprostřed tloušťky (stejně jako u přímé stěny).
import { cross, offsetPath, sub, tessellate, type Path, type Vec2 } from '@bim-light/core';
import type { Session } from '../../session/session.ts';
import { typeThickness } from './wall-links.ts';

/** +1 = bod `q` leží vlevo od směru `dir` z bodu `a`, −1 = vpravo. */
export const sideOf = (a: Vec2, dir: Vec2, q: Vec2): 1 | -1 => (cross(dir, sub(q, a)) >= 0 ? 1 : -1);

export function arcGhost(s: Session, path: Path): Vec2[] {
  const t = typeThickness(s.model, s.wallTypeId);
  const signed = s.wallSide === 'left' ? t : -t;
  const back = s.wallRefLine === 'axis' ? -signed / 2 : 0;
  const a = tessellate(offsetPath(path, back));
  const b = tessellate(offsetPath(path, back + signed));
  return [...a, ...b.reverse()];
}
