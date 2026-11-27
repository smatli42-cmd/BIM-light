// Výšková kóta terénu u nároží stavby v půdorysu (DSP, české zvyklosti; vzor Arditu): kroužek s vyplněnou
// polovinou a malým čtvercem bodu, šikmá odkazová čára k vodorovné poličce, nad ní „RT=-0,150“ (rostlý
// terén), pod ní „UT=-0,150“ (upravený terén). Terén zatím v modelu není – RT a UT jsou čísla u značky
// (mm k ±0,000); až bude terén, vezmou se z něj. Značka je navázaná na roh stěny (líc u konce stěny), takže
// se s ním posune. Popisky a co se zobrazí (RT, UT, obojí) jsou ve stylu (`Style.terrainLabels`).
import type { Primitive, PrimitiveSource, Stroke } from '../drawing/primitives.ts';
import { dist, endPoint, type Vec2 } from '../geometry/index.ts';
import type { Id } from '../ids/index.ts';
import type { Model } from '../model/types.ts';
import type { ResolvedEffect, Style, TerrainLabels } from '../style/types.ts';
import { wallGeometry } from '../wall/geometry.ts';
import { allWalls } from '../wall/queries.ts';
import { absoluteText, elevationText } from './value.ts';

/** Roh stěny: líc (ref / opp) u konce stěny. */
export interface CornerAnchor {
  readonly wallId: Id;
  readonly end: 'start' | 'end';
  readonly face: 'ref' | 'opp';
}

export const DEFAULT_TERRAIN_LABELS: TerrainLabels = { rt: 'RT', ut: 'UT', show: 'both' };

/** Roh stěny podlaží nejblíž bodu (do `tol` mm); null = žádný. */
export function cornerAt(model: Model, storeyId: Id, p: Vec2, tol: number): CornerAnchor | null {
  let best: CornerAnchor | null = null;
  let bestD = tol;
  for (const w of allWalls(model)) {
    if (w.storeyId !== storeyId || w.variant.kind !== 'main') continue;
    const g = wallGeometry(model, w);
    for (const face of ['ref', 'opp'] as const)
      for (const end of ['start', 'end'] as const) {
        const d = dist(endPoint(g.faces[face], end), p);
        if (d <= bestD) [best, bestD] = [{ wallId: w.id, end, face }, d];
      }
  }
  return best;
}

/** Bod rohu z modelu; null = stěna už neexistuje. */
export function cornerPoint(model: Model, a: CornerAnchor): Vec2 | null {
  const w = model.elements[a.wallId];
  if (!w || w.category !== 'wall') return null;
  return endPoint(wallGeometry(model, w).faces[a.face], a.end);
}

/** Řádky textu kóty terénu podle stylu: „RT=-0,150“, „UT=-0,150“ (absolutně „m n. m.“). */
export function terrainLines(
  model: Model,
  style: Style | undefined,
  v: { rt: number | null; ut: number | null; absolute: boolean },
): string[] {
  const l = style?.terrainLabels ?? DEFAULT_TERRAIN_LABELS;
  const fmt = (z: number) => (v.absolute ? absoluteText(model, z) : elevationText(z));
  const row = (label: string, z: number | null) => `${label}=${z === null ? '?' : fmt(z)}`;
  const rows: string[] = [];
  if (l.show !== 'ut') rows.push(row(l.rt, v.rt));
  if (l.show !== 'rt') rows.push(row(l.ut, v.ut));
  return rows;
}

/** Přibližná šířka textu na papíře (mm) – písmo kreslí vykreslení, jádro jen odhaduje. */
export const textWidth = (text: string, h: number) => text.length * h * 0.62;

export const circle = (c: Vec2, r: number, a0: number, a1: number, n = 24): Vec2[] =>
  Array.from({ length: n + 1 }, (_, i) => {
    const a = a0 + ((a1 - a0) * i) / n;
    return { x: c.x + r * Math.cos(a), y: c.y + r * Math.sin(a) };
  });

export interface Painter {
  readonly text: (at: Vec2, t: string) => Primitive;
  readonly line: (points: Vec2[], closed?: boolean) => Primitive;
  readonly fill: (polygon: Vec2[]) => Primitive;
}

export function painter(id: Id, g: ResolvedEffect, th: number): Painter {
  const source: PrimitiveSource = { dimensionId: id, role: 'výšková kóta' };
  const stroke: Stroke = { pen: g.projectionPen, color: g.lineColor, lineType: 'solid' };
  return {
    text: (at, t) => ({ kind: 'text', at, text: t, heightMm: th, angle: 0, color: g.lineColor, source }),
    line: (points, closed = false) => ({ kind: 'line', points, closed, stroke, source }),
    fill: (polygon) => ({ kind: 'fill', polygon, color: g.lineColor, transparency: 0, source }),
  };
}

/** Kroužek s polovinou plnou, čtverec bodu, odkazová čára k poličce, řádky nad a pod ní (`th` v mm modelu). */
export function drawTerrainMark(
  m: { point: Vec2; textAt: Vec2; lines: readonly string[] },
  r: number,
  th: number,
  p: Painter,
): Primitive[] {
  const shelf = Math.max(...m.lines.map((t) => textWidth(t, th)), r * 2);
  const dir = m.textAt.x >= m.point.x ? 1 : -1;
  const end = { x: m.textAt.x + dir * shelf, y: m.textAt.y };
  const mid = (m.textAt.x + end.x) / 2;
  const q = r * 0.35;
  const square = [
    { x: m.point.x - q, y: m.point.y - q },
    { x: m.point.x + q, y: m.point.y - q },
    { x: m.point.x + q, y: m.point.y + q },
    { x: m.point.x - q, y: m.point.y + q },
  ];
  const [top, bottom] = m.lines;
  const out = [
    p.fill(circle(m.point, r, 0, Math.PI)),
    p.line(circle(m.point, r, 0, 2 * Math.PI), true),
    p.line(square, true),
    p.line([m.point, m.textAt, end]),
  ];
  if (top) out.push(p.text({ x: mid, y: m.textAt.y + th * 0.8 }, top));
  if (bottom) out.push(p.text({ x: mid, y: m.textAt.y - th * 0.8 }, bottom));
  return out;
}
