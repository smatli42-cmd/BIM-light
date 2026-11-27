// Kresba značky typu stěny (plán stěn Z8): kroužek se značkou typu. Velikost z velikostí na papíře
// (výška popisu), pero a barva z funkce grafiky (základy 11, 29); kroužek leží vedle líce stěny.
import { findWall } from '../wall/queries.ts';
import type { Primitive } from '../drawing/primitives.ts';
import { add, mul, offsetPath, pointAt, type Vec2 } from '../geometry/index.ts';
import type { Model } from '../model/types.ts';
import type { ElementFacts } from '../style/conditions.ts';
import type { PaperSizes, ResolvedEffect } from '../style/types.ts';
import { wallGeometry } from '../wall/geometry.ts';
import type { WallTag } from './types.ts';

/** Poloměr kroužku vůči výšce písma (kroužek obepne dvě až tři znaky). */
const RING = 1.25;
const SEGMENTS = 32;

/** Fakta o značce pro funkci grafiky (anotace kategorie „label“). */
export function tagFacts(t: WallTag): ElementFacts {
  return {
    id: t.id,
    category: 'label',
    discipline: '',
    status: '',
    variant: 'main',
    typeId: '',
    materialIds: [],
  };
}

/** Střed značky v modelu (mm) – vedle zvoleného líce, nebo na ose. */
export function tagCenter(m: Model, t: WallTag, scale: number, paper: PaperSizes): Vec2 | null {
  const w = findWall(m, t.wallId);
  if (!w) return null;
  const g = wallGeometry(m, w, Number.NEGATIVE_INFINITY);
  if (t.side === 'on') return pointAt(g.faces.axis, t.position);
  const face = g.faces[t.side];
  const away = Math.sign(g.section.faces[t.side] - g.section.faces.axis) || 1;
  const gap = (paper.extensionGap + paper.labelText * RING) * scale;
  return pointAt(offsetPath(face, away * gap), t.position);
}

export function drawWallTag(
  m: Model,
  t: WallTag,
  scale: number,
  paper: PaperSizes,
  g: ResolvedEffect,
): Primitive[] {
  const w = findWall(m, t.wallId);
  const c = tagCenter(m, t, scale, paper);
  if (!g.visible || !w || !c) return [];
  const r = paper.labelText * RING * scale;
  const ring = Array.from({ length: SEGMENTS }, (_, i) => {
    const a = (i / SEGMENTS) * 2 * Math.PI;
    return add(c, mul({ x: Math.cos(a), y: Math.sin(a) }, r));
  });
  const source = (role: string) => ({ elementId: t.id, role });
  const out: Primitive[] = [];
  if (g.fillColor)
    out.push({
      kind: 'fill',
      polygon: ring,
      color: g.fillColor,
      transparency: 0,
      source: source('výplň značky'),
    });
  out.push({
    kind: 'line',
    points: ring,
    closed: true,
    stroke: { pen: g.projectionPen, color: g.lineColor, lineType: 'solid' },
    source: source('kroužek značky'),
  });
  out.push({
    kind: 'text',
    at: c,
    text: m.wallTypes[w.typeId]?.mark ?? '?',
    heightMm: paper.labelText,
    angle: 0,
    color: g.lineColor,
    source: source('značka typu'),
  });
  return out;
}
