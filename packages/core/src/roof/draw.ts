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
import type { RoofLineKind } from './lines.ts';
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

type Part = 'below' | 'cut' | 'above';

interface Ctx {
  readonly roof: Roof;
  readonly g: ResolvedEffect;
  readonly cut: number;
  /** Svislé odsazení horního a spodního líce skladby od referenční roviny = d × sec sklonu. */
  readonly top: number;
  readonly bottom: number;
}

const lerp = (a: Vec2, b: Vec2, t: number): Vec2 => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });

/** Rozdělí úsečku (výšky z0, z1 v referenční rovině) na části pod řezem, v řezu a nad řezem. */
function split(a: Vec2, b: Vec2, z0: number, z1: number, c: Ctx, sec: number): [Vec2, Vec2, Part][] {
  const limits = [c.cut - c.top * sec, c.cut - c.bottom * sec];
  const ts = [0, 1];
  for (const z of limits) if ((z0 - z) * (z1 - z) < 0) ts.push((z - z0) / (z1 - z0));
  ts.sort((x, y) => x - y);
  const out: [Vec2, Vec2, Part][] = [];
  for (let i = 0; i + 1 < ts.length; i++) {
    const t0 = ts[i] as number;
    const t1 = ts[i + 1] as number;
    if (t1 - t0 < 1e-9) continue;
    const z = z0 + (z1 - z0) * ((t0 + t1) / 2);
    const part: Part = z + c.top * sec < c.cut ? 'below' : z + c.bottom * sec > c.cut ? 'above' : 'cut';
    out.push([lerp(a, b, t0), lerp(a, b, t1), part]);
  }
  return out;
}

function stroke(c: Ctx, part: Part): Stroke {
  if (part === 'cut') return { pen: c.g.cutPen, color: c.g.lineColor, lineType: c.g.lineType };
  return {
    pen: c.g.projectionPen,
    color: c.g.lineColor,
    lineType: part === 'above' ? 'dashed' : c.g.lineType,
  };
}

/** Průsečík roviny s výškou z uvnitř obrysu roviny (úseky přímky). */
function contour(geo: RoofGeometry, p: RoofPlane, z: number): [Vec2, Vec2][] {
  const e = geo.edges[p.edge] as EdgeLine;
  const k = e.c + (z - geo.refZ) / e.tan;
  const pts = p.polygon;
  const ts: number[] = [];
  pts.forEach((a, i) => {
    const b = pts[(i + 1) % pts.length] as Vec2;
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

export function drawRoof(model: Model, roof: Roof, cutPlane: number, g: ResolvedEffect): Primitive[] {
  if (!g.visible) return [];
  const geo = roofGeometry(model, roof);
  const offsets = roofLayerOffsets(roofLayers(model, roof));
  const c: Ctx = {
    roof,
    g,
    cut: (model.storeys[roof.storeyId]?.elevation ?? 0) + cutPlane,
    top: offsets.at(-1) ?? 0,
    bottom: offsets[0] ?? 0,
  };
  const out: Primitive[] = [];
  const line = (a: Vec2, b: Vec2, s: Stroke, role: string): Primitive => ({
    kind: 'line',
    points: [a, b],
    closed: false,
    stroke: s,
    source: { elementId: roof.id, role },
  });
  for (const l of geo.lines) {
    const sec = 1 / ((geo.planes.find((p) => p.edge === l.planes[0])?.normal.z ?? 1) || 1);
    for (const [a, b, part] of split(l.a, l.b, l.a.z, l.b.z, c, sec))
      out.push(line(a, b, stroke(c, part), ROLE[l.kind]));
  }
  for (const p of geo.planes) {
    const sec = 1 / p.normal.z;
    for (const d of [c.top, c.bottom])
      for (const [a, b] of contour(geo, p, c.cut - d * sec))
        out.push(line(a, b, stroke(c, 'cut'), 'střecha v řezu'));
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
