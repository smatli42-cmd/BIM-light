// Doplňky kresby stěn v půdorysu (plán stěn Z6): stěna mimo rovinu řezu, značka referenční čáry,
// konstrukční zobrazení (které vrstvy se kreslí) a poznání čelní hrany volného konce.
// Pero, barva a zapnutí vždy z funkce grafiky (základ 11); typ čáry „mimo řez“ je pravidlo kresby.
import type { Primitive } from '../drawing/primitives.ts';
import { cross, dist, dot, endPoint, sub, tessellate, type Vec2 } from '../geometry/index.ts';
import type { PathEnd } from '../geometry/index.ts';
import type { ResolvedEffect } from '../style/types.ts';
import type { WallCut } from './cut.ts';
import type { WallGeometry } from './geometry.ts';

/** Konstrukční zobrazení (koncepce rozhraní 2 G, položka 9): celá skladba, bez povrchů, jen jádro. */
export type Structure = 'all' | 'no-finish' | 'core';

/** Geometrie jen s vrstvami, které konstrukční zobrazení ukazuje (obrys = jejich mnohoúhelníky). */
export function filterLayers(geom: WallGeometry, structure: Structure): WallGeometry {
  if (structure === 'all') return geom;
  const keep = geom.layers.filter((l) =>
    structure === 'core' ? l.span.layer.function === 'core' : l.span.layer.function !== 'finish',
  );
  if (!keep.length || keep.length === geom.layers.length) return geom;
  const outlines = keep.flatMap((l) => l.polygons);
  return { ...geom, layers: keep, outlines, outline: outlines[0] ?? [] };
}

/** Stěna celá pod rovinou řezu (plná čára, pohled) nebo nad ní (čárkovaně): jen obrys, bez výplně. */
export function drawProjected(
  geom: WallGeometry,
  g: ResolvedEffect,
  cut: Exclude<WallCut, 'cut'>,
): Primitive[] {
  const lineType = cut === 'above' ? 'dashed' : g.lineType;
  return geom.outlines.map((points) => ({
    kind: 'line',
    points,
    closed: true,
    stroke: { pen: g.projectionPen, color: g.lineColor, lineType },
    source: { elementId: geom.wallId, role: cut === 'above' ? 'stěna nad řezem' : 'stěna pod řezem' },
  }));
}

/** Značka referenční čáry: tenká čerchovaná čára po referenční čáře (zapíná ji grafika `refLine`). */
export function drawRefLine(geom: WallGeometry, g: ResolvedEffect): Primitive[] {
  if (!g.refLine) return [];
  return [
    {
      kind: 'line',
      points: tessellate(geom.path),
      closed: false,
      stroke: { pen: g.layerPen, color: g.lineColor, lineType: 'dash-dot' },
      source: { elementId: geom.wallId, role: 'referenční čára' },
    },
  ];
}

/** Čelní úsečky volných konců stěny (spojnice konců obou líců). */
export function freeEndCaps(geom: WallGeometry): [Vec2, Vec2][] {
  const ends: PathEnd[] = ['start', 'end'];
  return ends
    .filter((e) => geom.cuts[e].join === 'free')
    .map((e) => [endPoint(geom.faces.ref, e), endPoint(geom.faces.opp, e)]);
}

/** Leží úsečka a–b na čele [p, q]? (tolerance 0,5 mm) */
export function onCap(a: Vec2, b: Vec2, [p, q]: [Vec2, Vec2]): boolean {
  const d = sub(q, p);
  const l = Math.hypot(d.x, d.y);
  if (l < 1e-9) return false;
  const near = (x: Vec2) => {
    const t = dot(sub(x, p), d) / (l * l);
    return t > -1e-6 && t < 1 + 1e-6 && Math.abs(cross(sub(x, p), d)) / l < 0.5;
  };
  return near(a) && near(b) && dist(a, b) > 1e-9;
}
