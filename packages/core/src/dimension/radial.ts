// Kóta mezi soustřednými líci oblouku (tloušťka obloukové stěny, hlášení uživatele 2026-11-26):
// kótovací čára leží na paprsku ze středu. Odsazení kóty = délka oblouku prvního líce od jeho středu
// k paprsku (kladně proti směru hodin), takže kóta jde posunout po oblouku jako u přímé stěny podél líce.
import { add, angleOf, arcData, dist, mul, pointAt, sub, type Path, type Vec2 } from '../geometry/index.ts';

type Arc = Extract<Path, { kind: 'arc' }>;
const isArc = (p: Path): p is Arc => p.kind === 'arc' && Math.abs(p.bulge) > 1e-9;
const unit = (a: number): Vec2 => ({ x: Math.cos(a), y: Math.sin(a) });
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

/** Střed a poloměry, jsou-li oba líce soustředné oblouky; jinak null. */
function concentric(fa: Path, fb: Path) {
  if (!isArc(fa) || !isArc(fb)) return null;
  const [a, b] = [arcData(fa), arcData(fb)];
  if (dist(a.center, b.center) > 1) return null;
  return { c: a.center, ra: a.radius, rb: b.radius, mid: angleOf(sub(pointAt(fa, 0.5), a.center)) };
}

/** Body kótovací čáry (na líci A a B) pro odsazení `offset`, nebo null u nesoustředných líců. */
export function radialPoints(fa: Path, fb: Path, offset: number): { base: Vec2; pB: Vec2 } | null {
  const k = concentric(fa, fb);
  if (!k) return null;
  const u = unit(k.mid + offset / k.ra);
  return { base: add(k.c, mul(u, k.ra)), pB: add(k.c, mul(u, k.rb)) };
}

/** Poloha bodu `p` po oblouku líce: délka oblouku od středu líce k paprsku přes `p` (poloměr, průměr). */
export function arcOffset(face: Path, p: Vec2): number | null {
  if (!isArc(face)) return null;
  const { center, radius } = arcData(face);
  return radius * wrap(angleOf(sub(p, center)) - angleOf(sub(pointAt(face, 0.5), center)));
}

/** Jednotkový paprsek líce v poloze `offset` po oblouku od jeho středu. */
export function arcRay(face: Path, offset: number): Vec2 | null {
  if (!isArc(face)) return null;
  const { center, radius } = arcData(face);
  return unit(angleOf(sub(pointAt(face, 0.5), center)) + offset / radius);
}

/** Odsazení, při kterém kótovací čára leží na paprsku přes bod `p`; null u nesoustředných líců. */
export function radialOffset(fa: Path, fb: Path, p: Vec2): number | null {
  const k = concentric(fa, fb);
  return k ? k.ra * wrap(angleOf(sub(p, k.c)) - k.mid) : null;
}
