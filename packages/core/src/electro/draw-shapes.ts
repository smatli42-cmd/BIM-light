// Tvary značky → primitiva kresby (základy 11, 29, 32): velikost v jednotkách značky (mm na papíře
// × měřítko), pero, barva a typ čáry jen z funkce grafiky. Text je vždy čitelný (zdola nebo zprava).
import type { Primitive, PrimitiveSource } from '../drawing/primitives.ts';
import type { Vec2 } from '../geometry/index.ts';
import type { ResolvedEffect } from '../style/types.ts';
import { toWorld, type ElectroFrame } from './place.ts';
import type { SymbolShape } from './types.ts';

const SEGMENTS = 24;

/** Body oblouku (úhly ve stupních proti směru hodin). */
function arcPoints(c: Vec2, r: number, from: number, to: number): Vec2[] {
  const sweep = to - from;
  const n = Math.max(4, Math.ceil((Math.abs(sweep) / 360) * SEGMENTS));
  return Array.from({ length: n + 1 }, (_, i) => {
    const a = ((from + (sweep * i) / n) * Math.PI) / 180;
    return { x: c.x + r * Math.cos(a), y: c.y + r * Math.sin(a) };
  });
}

const ringPoints = (c: Vec2, r: number) => arcPoints(c, r, 0, 360).slice(0, -1);

/** Úhel textu podél osy x soustavy, otočený tak, aby šel číst zdola nebo zprava. */
export function readableAngle(ex: Vec2): number {
  let a = Math.atan2(ex.y, ex.x);
  if (a > Math.PI / 2 + 1e-9) a -= Math.PI;
  if (a <= -Math.PI / 2 + 1e-9) a += Math.PI;
  return a;
}

export interface ShapeContext {
  readonly frame: ElectroFrame;
  /** Jednotka značky v mm modelu (velikost na papíře × měřítko). */
  readonly unit: number;
  /** Velikost značky na papíře (mm) – pro výšku textu. */
  readonly sizeMm: number;
  readonly g: ResolvedEffect;
  readonly source: PrimitiveSource;
}

function shapePrimitive(s: SymbolShape, dx: number, c: ShapeContext): Primitive {
  const w = (p: Vec2) => toWorld(c.frame, (p.x + dx) * c.unit, p.y * c.unit);
  const stroke = { pen: c.g.projectionPen, color: c.g.lineColor, lineType: c.g.lineType };
  const lineOf = (pts: Vec2[], closed: boolean): Primitive => ({
    kind: 'line',
    points: pts.map(w),
    closed,
    stroke,
    source: c.source,
  });
  const fillOf = (pts: Vec2[]): Primitive => ({
    kind: 'fill',
    polygon: pts.map(w),
    color: c.g.lineColor,
    transparency: 0,
    source: c.source,
  });
  switch (s.kind) {
    case 'line':
      return lineOf([...s.points], !!s.closed);
    case 'circle':
      return lineOf(ringPoints(s.center, s.r), true);
    case 'arc':
      return lineOf(arcPoints(s.center, s.r, s.from, s.to), false);
    case 'fill':
      return fillOf([...s.points]);
    case 'disc':
      return fillOf(ringPoints(s.center, s.r));
    case 'text':
      return {
        kind: 'text',
        at: w(s.at),
        text: s.text,
        heightMm: s.size * c.sizeMm,
        angle: readableAngle(c.frame.ex),
        color: c.g.lineColor,
        source: c.source,
      };
  }
}

/** Primitiva tvarů posunutých o `dx` jednotek po ose x (slot rámečku). */
export const drawShapes = (shapes: readonly SymbolShape[], dx: number, c: ShapeContext): Primitive[] =>
  shapes.map((s) => shapePrimitive(s, dx, c));
