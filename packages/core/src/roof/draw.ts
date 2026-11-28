// Kresba střechy v půdorysu (rozhodnutí 11, S1; české zvyklosti): část střechy nad rovinou řezu čárkovaně
// (okap, štít, hřeben, nároží, úžlabí), část pod rovinou řezu (pohled dolů v podkroví) plnou čarou pohledu
// a průsečík střechy s rovinou řezu (horní a spodní líc skladby) perem řezu. Pero, barva a typ čáry jen
// z funkce grafiky (základ 11); stejné ve všech podrobnostech (základ 5).
import { dot, type Vec2 } from '../geometry/index.ts';
import type { Primitive, Stroke } from '../drawing/primitives.ts';
import type { Model } from '../model/types.ts';
import { elementFacts } from '../style/conditions.ts';
import { resolveGraphics } from '../style/graphics.ts';
import type { ResolvedEffect } from '../style/types.ts';
import { categoryState } from '../view/effective.ts';
import type { View } from '../view/types.ts';
import type { EdgeLine } from './edge-lines.ts';
import { classifyLines, type RoofLineKind } from './lines.ts';
import { roofSolids } from './solids.ts';
import type { Vec3 } from '../covering/frame.ts';
import { roofGeometry, type RoofGeometry, type RoofPlane } from './planes.ts';
import { allRoofs, roofLayerOffsets, roofLayers } from './queries.ts';
import type { Roof } from './types.ts';

const ROLE: Record<RoofLineKind, string> = {
  eave: 'okap',
  gable: 'štít',
  ridge: 'hřeben',
  hip: 'nároží',
  valley: 'úžlabí',
};

const lerp = (a: Vec2, b: Vec2, t: number): Vec2 => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });

/** Rozdělí hranu horního líce na část pod rovinou řezu (vidět shora) a nad ní (čárkovaně). */
function split(a: Vec3, b: Vec3, cut: number): [Vec2, Vec2, boolean][] {
  const ts = [0, 1];
  if ((a.z - cut) * (b.z - cut) < 0) ts.push((cut - a.z) / (b.z - a.z));
  ts.sort((x, y) => x - y);
  const out: [Vec2, Vec2, boolean][] = [];
  for (let i = 0; i + 1 < ts.length; i++) {
    const [t0, t1] = [ts[i] as number, ts[i + 1] as number];
    if (t1 - t0 < 1e-9) continue;
    const z = a.z + (b.z - a.z) * ((t0 + t1) / 2);
    out.push([lerp(a, b, t0), lerp(a, b, t1), z > cut]);
  }
  return out;
}

/** Průsečík roviny p (odsazené o d) s výškou z uvnitř obrysu plochy `poly` (úseky přímky). */
function contour(geo: RoofGeometry, p: RoofPlane, poly: readonly Vec2[], z: number): [Vec2, Vec2][] {
  const e = geo.edges[p.edge] as EdgeLine;
  const k = e.c + (z - geo.refZ) / e.tan;
  const ts: number[] = [];
  poly.forEach((a, i) => {
    const b = poly[(i + 1) % poly.length] as Vec2;
    const sa = dot(e.n, a) - k;
    const sb = dot(e.n, b) - k;
    if (sa > 0 === sb > 0) return;
    ts.push(dot(lerp(a, b, sa / (sa - sb)), e.d));
  });
  ts.sort((x, y) => x - y);
  const at = (s: number): Vec2 => ({ x: e.n.x * k + e.d.x * s, y: e.n.y * k + e.d.y * s });
  const out: [Vec2, Vec2][] = [];
  for (let i = 0; i + 1 < ts.length; i += 2) out.push([at(ts[i] as number), at(ts[i + 1] as number)]);
  return out;
}

/**
 * Půdorys kreslí plochy vrstev (stejná tělesa jako 3D a řez, solids.ts): hrany horního líce (okap, nároží,
 * hřeben…) – pod rovinou řezu plně, nad ní čárkovaně; průsečík horního líce s rovinou řezu na ploše horního
 * líce a spodního líce na ploše spodního líce. Sousední roviny mají v každé vrstvě společné hrany, takže
 * se čáry v rozích potkají.
 */
export function drawRoof(model: Model, roof: Roof, cutPlane: number, g: ResolvedEffect): Primitive[] {
  if (!g.visible) return [];
  const geo = roofGeometry(model, roof);
  const offsets = roofLayerOffsets(roofLayers(model, roof));
  const solids = roofSolids(model, roof, geo);
  const last = Math.max(0, ...solids.map((s) => s.layer));
  const surface = (p: RoofPlane, layer: number, side: 'top' | 'bottom') =>
    solids.find((s) => s.plane === p.edge && s.layer === layer)?.[side] ?? p.polygon;
  const cut = (model.storeys[roof.storeyId]?.elevation ?? 0) + cutPlane;
  const line = (a: Vec2, b: Vec2, s: Stroke, role: string): Primitive => ({
    kind: 'line',
    points: [a, b],
    closed: false,
    stroke: s,
    source: { elementId: roof.id, role },
  });
  const seen = (above: boolean): Stroke => ({
    pen: g.projectionPen,
    color: g.lineColor,
    lineType: above ? 'dashed' : g.lineType,
  });
  const cutStroke: Stroke = { pen: g.cutPen, color: g.lineColor, lineType: g.lineType };
  const top = geo.planes.map((p) => ({ ...p, polygon: surface(p, last, 'top') }));
  const out: Primitive[] = [];
  for (const l of classifyLines(top, geo.edges, geo))
    for (const [a, b, above] of split(l.a, l.b, cut)) out.push(line(a, b, seen(above), ROLE[l.kind]));
  for (const p of geo.planes) {
    const sec = 1 / p.normal.z;
    const faces: [readonly Vec2[], number][] = [
      [surface(p, last, 'top'), offsets.at(-1) ?? 0],
      [surface(p, 0, 'bottom'), offsets[0] ?? 0],
    ];
    for (const [poly, d] of faces)
      for (const [a, b] of contour(geo, p, poly, cut - d * sec))
        out.push(line(a, b, cutStroke, 'střecha v řezu'));
  }
  return out;
}

/** Střechy podlaží pohledu (hlavní model, viditelná vrstva Střechy, funkce grafiky). */
export function drawRoofs(model: Model, view: View): Primitive[] {
  if (!categoryState(model.display, view, 'roof').visible) return [];
  return allRoofs(model)
    .filter((r) => r.storeyId === view.storeyId && r.variant.kind === 'main')
    .flatMap((r) =>
      drawRoof(model, r, view.cutPlane, resolveGraphics(model.display, view, elementFacts(model, r)).effect),
    );
}
