// Kresba otvoru v desce v půdorysu (D3; rozhodnutí prvky stavby 15, české zvyklosti): obrys otvoru
// a úhlopříčky (křížem); otvor jen v deskách nad rovinou řezu čárkovaně. Pero, barva a typ čáry z funkce
// grafiky kategorie „opening“ (základ 11); stejné ve všech podrobnostech (základ 5).
import type { Primitive } from '../drawing/primitives.ts';
import type { Vec2 } from '../geometry/index.ts';
import type { Model } from '../model/types.ts';
import { slabCutRelation } from '../slab/draw.ts';
import { variantKey, type ElementFacts } from '../style/conditions.ts';
import type { ResolvedEffect } from '../style/types.ts';
import type { SlabOpening } from './types.ts';

export function slabOpeningFacts(o: SlabOpening): ElementFacts {
  const facts = {
    id: o.id,
    category: o.category,
    discipline: o.discipline,
    status: o.status,
    variant: variantKey(o.variant),
    typeId: '',
    materialIds: [],
  };
  return o.graphicOverride ? { ...facts, graphicOverride: o.graphicOverride } : facts;
}

/** Je otvor jen v deskách nad rovinou řezu? (pak se kreslí čárkovaně) */
export function slabOpeningAbove(model: Model, o: SlabOpening, cutPlane: number): boolean {
  const hosts = o.hostIds.map((id) => model.elements[id]).filter((e) => e?.category === 'slab');
  return hosts.length > 0 && hosts.every((s) => slabCutRelation(model, s, cutPlane) === 'above');
}

/** Úhlopříčky (kříž): u obdélníku spojnice protilehlých rohů, jinak bod 0 a 1 s protějšími body. */
function diagonals(pts: readonly Vec2[]): [Vec2, Vec2][] {
  const n = pts.length;
  const half = Math.floor(n / 2);
  return [0, 1].map((i) => [pts[i] as Vec2, pts[(i + half) % n] as Vec2]);
}

export function drawSlabOpening(
  model: Model,
  o: SlabOpening,
  cutPlane: number,
  g: ResolvedEffect,
): Primitive[] {
  if (!g.visible) return [];
  const above = slabOpeningAbove(model, o, cutPlane);
  const stroke = {
    pen: g.projectionPen,
    color: g.lineColor,
    lineType: above ? 'dashed' : g.lineType,
  } as const;
  const source = { elementId: o.id, role: above ? 'otvor v desce nad řezem' : 'otvor v desce' };
  return [
    { kind: 'line', points: o.outline, closed: true, stroke, source },
    ...diagonals(o.outline).map(([a, b]): Primitive => ({
      kind: 'line',
      points: [a, b],
      closed: false,
      stroke,
      source,
    })),
  ];
}
