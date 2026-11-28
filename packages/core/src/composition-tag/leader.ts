// Geometrie odkazové čáry popisu skladby (pravidlo v jádře, platí pro myš i AI): první úsek vždy kolmo ke
// konstrukci – deska (vrstvy vodorovně) svisle, stěna (vrstvy svisle) vodorovně, střecha kolmo k rovině
// (osa z cross.ts); další body lomí čáru. Tažení konce zachová pravé úhly (z jednoho úseku vznikne „L“).
import type { Vec2 } from '../geometry/index.ts';

/** Jednotkový směr kolmice ke konstrukci (vůči bodu uchycení). */
export type LeaderAxis = Vec2;
/** Vodorovná kolmice (stěna). */
export const AXIS_X: LeaderAxis = { x: 1, y: 0 };
/** Svislá kolmice (deska). */
export const AXIS_Y: LeaderAxis = { x: 0, y: 1 };

const EPS = 1;
const clean = (n: number) => (Math.abs(n) < 1e-9 ? 0 : n);

/** Bod promítnutý na kolmici ke konstrukci (vůči bodu uchycení). */
export function onPerpendicular(axis: LeaderAxis, p: Vec2): Vec2 {
  const t = p.x * axis.x + p.y * axis.y;
  return { x: clean(axis.x * t), y: clean(axis.y * t) };
}

/** Body čáry: první na kolmici, bez nulových úseků; prázdné = null (čára musí mít aspoň jeden bod). */
export function normalizeLeader(axis: LeaderAxis, pts: readonly Vec2[]): Vec2[] | null {
  const out: Vec2[] = [];
  let prev: Vec2 = { x: 0, y: 0 };
  pts.forEach((p, i) => {
    const q = i === 0 ? onPerpendicular(axis, p) : p;
    if (Math.hypot(q.x - prev.x, q.y - prev.y) < EPS) return;
    out.push(q);
    prev = q;
  });
  return out.length ? out : null;
}

const horizontal = (a: Vec2, b: Vec2) => Math.abs(b.y - a.y) <= Math.abs(b.x - a.x);

/** Lom na kolmici pro konec `end`: dál vodorovně (kolmice spíš svislá), jinak svisle. */
function bendFor(axis: LeaderAxis, end: Vec2): Vec2 {
  if (Math.abs(axis.y) >= 0.3) {
    const t = end.y / axis.y;
    return { x: clean(axis.x * t), y: end.y };
  }
  const t = end.x / axis.x;
  return { x: end.x, y: clean(axis.y * t) };
}

/** Posun konce čáry (tažení textu): předchozí bod se srovná, aby poslední úsek zůstal vodorovný / svislý. */
export function moveLeaderEnd(axis: LeaderAxis, leader: readonly Vec2[], delta: Vec2): Vec2[] | null {
  const n = leader.length;
  const last = leader[n - 1];
  if (!last) return null;
  const end = { x: last.x + delta.x, y: last.y + delta.y };
  if (n === 1) return normalizeLeader(axis, [bendFor(axis, end), end]);
  const prev = leader[n - 2] as Vec2;
  const fixed = horizontal(prev, last) ? { x: prev.x, y: end.y } : { x: end.x, y: prev.y };
  return normalizeLeader(axis, [...leader.slice(0, n - 2), fixed, end]);
}

/** Další bod kreslené čáry: první na kolmici, další srovnané vodorovně / svisle (free = bez srovnání). */
export function nextLeaderPoint(axis: LeaderAxis, pts: readonly Vec2[], p: Vec2, free = false): Vec2 {
  const prev = pts[pts.length - 1];
  if (!prev) return onPerpendicular(axis, p);
  if (free) return p;
  return horizontal(prev, p) ? { x: p.x, y: prev.y } : { x: prev.x, y: p.y };
}
