// Kresba rekonstrukce u otvorů (plán stěn Z10, dokončení): místo otvoru v řezu stěny se kreslí jako část
// stěny v opačném stavu – probourání (nový otvor ve stávající stěně) = vybouraná část stěny, zazdívka
// (bouraný otvor) = nová konstrukce. Grafiku dá funkce grafiky pohledu (filtr rekonstrukce, základ 11):
// Bourací práce žlutě, Nový stav červeně; kde se neliší od stěny (stávající, plánovaný stav), nic navíc.
import type { Primitive } from '../drawing/primitives.ts';
import type { Model, Status } from '../model/types.ts';
import { elementFacts } from '../style/conditions.ts';
import { resolveGraphics } from '../style/graphics.ts';
import type { ResolvedEffect } from '../style/types.ts';
import type { View } from '../view/types.ts';
import type { Wall } from '../wall/types.ts';
import { openingOutline } from './draw.ts';
import { cutRelation } from './geometry.ts';
import type { Opening } from './types.ts';

/** Stav „záplaty“: probourání = bourání, zazdívka = nový; jinak nic (otvor ve stěně stejného stavu). */
function patchStatus(o: Opening, host: Wall): Status | null {
  if (o.status === 'new' && host.status !== 'new') return 'demolished';
  if (o.status === 'demolished' && host.status !== 'demolished') return 'new';
  return null;
}

const same = (a: ResolvedEffect, b: ResolvedEffect) =>
  a.lineColor === b.lineColor && a.lineType === b.lineType && a.fillColor === b.fillColor;

function patch(model: Model, view: View, o: Opening, host: Wall, hostG: ResolvedEffect): Primitive[] {
  const status = patchStatus(o, host);
  if (!status || o.storeyId !== view.storeyId || o.variant.kind !== 'main') return [];
  if (cutRelation(model, o, host, view.cutPlane) !== 'cut') return [];
  const g = resolveGraphics(model.display, view, { ...elementFacts(model, host), status }).effect;
  if (!g.visible || same(g, hostG)) return [];
  const polygon = openingOutline(model, o);
  const source = { elementId: o.id, role: status === 'demolished' ? 'probourání' : 'zazdívka' };
  const out: Primitive[] = [];
  if (g.fillColor)
    out.push({ kind: 'fill', polygon, color: g.fillColor, transparency: g.transparency, source });
  out.push({
    kind: 'line',
    points: polygon,
    closed: true,
    stroke: { pen: g.cutPen, color: g.lineColor, lineType: g.lineType },
    source,
  });
  return out;
}

/** Záplaty všech otvorů ve viditelných stěnách pohledu. */
export function drawRenovationPatches(
  model: Model,
  view: View,
  shown: readonly { readonly wall: Wall; readonly g: ResolvedEffect }[],
): Primitive[] {
  const hosts = new Map(shown.map((s) => [s.wall.id, s]));
  return Object.values(model.openings).flatMap((o) => {
    const h = hosts.get(o.hostId);
    return h ? patch(model, view, o, h.wall, h.g) : [];
  });
}
