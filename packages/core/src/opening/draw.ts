// Kresba otvoru, který stěnu v rovině řezu nepřeruší (plán stěn Z4, rozhodnutí 2: české zvyklosti):
// otvor celý nad rovinou řezu nebo pod ní = čárkovaný obrys v tloušťce stěny. Pero a barva z funkce
// grafiky (základ 11); otvor v řezu nekreslí nic navíc – stěnu přeruší výřez vrstev.
import type { Primitive } from '../drawing/primitives.ts';
import type { Model } from '../model/types.ts';
import { variantKey, type ElementFacts } from '../style/conditions.ts';
import type { ResolvedEffect } from '../style/types.ts';
import { getWall } from '../wall/queries.ts';
import { pointAtStation } from './along.ts';
import { openingAcross } from './edges.ts';
import { cutRelation, openingSpan } from './geometry.ts';
import type { Opening } from './types.ts';

/** Fakta o otvoru pro funkci grafiky. */
export function openingFacts(o: Opening): ElementFacts {
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

/** Počet úseků obrysu otvoru po oblouku. */
const ARC_STEPS = 16;

/** Obrys otvoru v půdorysu (čtyřúhelník v tloušťce stěny, u niky do hloubky). */
export function openingOutline(model: Model, o: Opening) {
  const host = getWall(model, o.hostId);
  const { s0, s1 } = openingSpan(o);
  const [a, b] = openingAcross(model, o);
  const at = (s: number, v: number) => pointAtStation(host.path, s, v);
  // U obloukové stěny obrys sleduje líce (body po oblouku), ostění jsou radiální (hlášení 2026-11-26).
  const n = host.path.kind === 'arc' && Math.abs(host.path.bulge) > 1e-9 ? ARC_STEPS : 1;
  const st = Array.from({ length: n + 1 }, (_, i) => s0 + ((s1 - s0) * i) / n);
  return [...st.map((s) => at(s, a)), ...st.reverse().map((s) => at(s, b))];
}

/** Čárkovaný obrys otvoru mimo rovinu řezu; otvor v řezu = nic. */
export function drawOpening(model: Model, o: Opening, cutPlane: number, g: ResolvedEffect): Primitive[] {
  const host = getWall(model, o.hostId);
  if (cutRelation(model, o, host, cutPlane) === 'cut') return [];
  return [
    {
      kind: 'line',
      points: openingOutline(model, o),
      closed: true,
      stroke: { pen: g.projectionPen, color: g.lineColor, lineType: 'dashed' },
      source: { elementId: o.id, role: 'otvor mimo řez' },
    },
  ];
}
