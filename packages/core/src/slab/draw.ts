// Kresba desky v půdorysu (D1). Deska pod rovinou řezu = obrys v pohledu (plná čára, pero pohledu),
// nad rovinou řezu = čárkovaně (jako otvor nad řezem, české zvyklosti), protnutá rovinou řezu = obrys
// perem řezu. Volitelná plná výplň z grafiky (`fillColor`). Pero, barva a typ čáry vždy z funkce
// grafiky (základ 11); stejné ve všech třech podrobnostech (základ 5) – vrstvy přijdou s řezem.
import type { Primitive } from '../drawing/primitives.ts';
import type { Model } from '../model/types.ts';
import type { ResolvedEffect } from '../style/types.ts';
import { slabLevels } from './geometry.ts';
import type { Slab } from './types.ts';

export type SlabCut = 'below' | 'cut' | 'above';

/** Poloha desky vůči rovině řezu pohledu (výška řezu nad úrovní podlaží desky). */
export function slabCutRelation(model: Model, s: Slab, cutPlane: number): SlabCut {
  const storey = model.storeys[s.storeyId];
  const cut = (storey?.elevation ?? 0) + cutPlane;
  const lv = slabLevels(model, s);
  if (lv.top <= cut) return 'below';
  return lv.bottom >= cut ? 'above' : 'cut';
}

const ROLE: Record<SlabCut, string> = {
  below: 'deska pod řezem',
  cut: 'deska v řezu',
  above: 'deska nad řezem',
};

export function drawSlab(model: Model, s: Slab, cutPlane: number, g: ResolvedEffect): Primitive[] {
  if (!g.visible) return [];
  const rel = slabCutRelation(model, s, cutPlane);
  const out: Primitive[] = [];
  if (g.fillColor && rel !== 'above') {
    out.push({
      kind: 'fill',
      polygon: s.outline,
      color: g.fillColor,
      transparency: g.transparency,
      source: { elementId: s.id, role: 'výplň desky' },
    });
  }
  // Ostrovy (sloup v místnosti) jsou konstrukce – kreslí se přes výplň; tady jen jejich obrys.
  for (const loop of [s.outline, ...(s.holes ?? [])])
    out.push({
      kind: 'line',
      points: loop,
      closed: true,
      stroke: {
        pen: rel === 'cut' ? g.cutPen : g.projectionPen,
        color: g.lineColor,
        lineType: rel === 'above' ? 'dashed' : g.lineType,
      },
      source: { elementId: s.id, role: ROLE[rel] },
    });
  return out;
}
