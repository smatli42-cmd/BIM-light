// Parametr bodu na křivce a rozdělení křivky (rozdělení stěny, katalog kreslení 5.3).
import { angleOf, dot, sub, type Vec2 } from './vec.ts';
import { arcData, type Path } from './path.ts';

/** Parametr 0..1 průmětu bodu na křivku (mimo rozsah = za koncem). */
export function paramOf(p: Path, point: Vec2): number {
  if (p.kind === 'line' || Math.abs(p.bulge) < 1e-9) {
    const d = sub(p.end, p.start);
    return dot(sub(point, p.start), d) / dot(d, d);
  }
  const a = arcData(p);
  let ang = angleOf(sub(point, a.center)) - angleOf(sub(p.start, a.center));
  const dir = Math.sign(a.sweep);
  while (ang * dir < 0) ang += 2 * Math.PI * dir;
  while (Math.abs(ang) > 2 * Math.PI) ang -= 2 * Math.PI * dir;
  return ang / a.sweep;
}

/** Rozdělí křivku v bodě, který na ní leží. */
export function splitPath(p: Path, at: Vec2): [Path, Path] {
  if (p.kind === 'line')
    return [
      { kind: 'line', start: p.start, end: at },
      { kind: 'line', start: at, end: p.end },
    ];
  const sweep = Math.abs(p.bulge) < 1e-9 ? 0 : arcData(p).sweep;
  const t = paramOf(p, at);
  return [
    { kind: 'arc', start: p.start, end: at, bulge: Math.tan((sweep * t) / 4) },
    { kind: 'arc', start: at, end: p.end, bulge: Math.tan((sweep * (1 - t)) / 4) },
  ];
}
