// Obrys každé vrstvy jedné stěny po napojení: pás vrstvy ∩ poloroviny obou konců − mezery (stěna jako
// hostitel v T, kříž, dvojice v uzlu, otvory v rovině řezu – Z4) + kousky navíc (zahnutá omítka).
// Kousky jedné vrstvy se slijí.
import {
  add,
  mul,
  offsetPath,
  sub,
  tangentAt,
  tessellate,
  type Path,
  type PathEnd,
  type Vec2,
} from '../geometry/index.ts';
import type { Model } from '../model/types.ts';
import { openingGaps } from '../opening/jamb.ts';
import { cuttingOpenings } from '../opening/geometry.ts';
import type { Opening } from '../opening/types.ts';
import { DEFAULT_CUT_HEIGHT } from '../wall/layers.ts';
import { wallSection } from '../wall/queries.ts';
import type { Wall } from '../wall/types.ts';
import { unionLoops } from './chain.ts';
import { neighbours, subEdges } from './edges.ts';
import { clipAll, MIN_AREA, signedArea } from './half-plane.ts';
import { crossings, throughNodes } from './nodes.ts';
import { crossNode, endResult, teeNode } from './solve.ts';
import type { EndJoin, EndResult, Gap, LayerEnd, NodeResult } from './types.ts';

export interface WallJunction {
  readonly joins: Readonly<Record<PathEnd, EndJoin>>;
  readonly ends: Readonly<Record<PathEnd, EndResult>>;
  /** Mnohoúhelníky každé vrstvy po napojení (index = pořadí vrstvy v řezu od referenční strany). */
  readonly layers: readonly (readonly (readonly Vec2[])[])[];
  /** Obrys stěny = sjednocení všech jejích vrstev (uzavřené smyčky proti směru hodin). */
  readonly outlines: readonly (readonly Vec2[])[];
}

/** Pás mezi offsety `lo` a `hi`, na koncích prodloužený po tečně (proti směru hodin). */
export function bandPolygon(path: Path, lo: number, hi: number, ext: Record<PathEnd, number>): Vec2[] {
  const ts = tangentAt(path, 'start');
  const te = tangentAt(path, 'end');
  const side = (o: number) => {
    const pts = tessellate(offsetPath(path, o));
    const first = pts[0] as Vec2;
    const last = pts[pts.length - 1] as Vec2;
    return [
      ...(ext.start > 0 ? [sub(first, mul(ts, ext.start))] : []),
      ...pts,
      ...(ext.end > 0 ? [add(last, mul(te, ext.end))] : []),
    ];
  };
  const poly = [...side(lo), ...side(hi).reverse()];
  return signedArea(poly) >= 0 ? poly : poly.reverse();
}

const big = (p: readonly Vec2[]) => p.length >= 3 && Math.abs(signedArea(p)) > MIN_AREA;

/** Slije kousky (sdílené hrany zmizí). */
export function mergePieces(pieces: readonly (readonly Vec2[])[]): Vec2[][] {
  if (pieces.length <= 1) return pieces.map((p) => [...p]);
  const set = subEdges(pieces);
  return unionLoops(set, neighbours(set)).filter(big);
}

function layerPieces(band: Vec2[], s: LayerEnd, e: LayerEnd, gaps: readonly Gap[]): Vec2[][] {
  let pieces: Vec2[][] = [];
  for (const vs of s.variants) for (const ve of e.variants) pieces.push(clipAll(band, [...vs, ...ve]));
  pieces.push(...s.extras.map((p) => [...p]), ...e.extras.map((p) => [...p]));
  pieces = pieces.filter(big);
  for (const g of gaps) pieces = pieces.flatMap((p) => g.keep.map((hs) => clipAll(p, hs))).filter(big);
  for (const g of gaps) pieces.push(...(g.extras ?? []).map((p) => [...p]).filter(big));
  return mergePieces(pieces);
}

/** Výsledky uzlů, ze kterých stěna čerpá (identita = klíč mezipaměti stěny). */
function sources(model: Model, wall: Wall) {
  const start = endResult(model, wall.id, 'start');
  const end = endResult(model, wall.id, 'end');
  const nodes: NodeResult[] = [start.node, end.node];
  for (const n of throughNodes(model, wall.id)) nodes.push(teeNode(model, n));
  for (const c of crossings(model, wall.id)) nodes.push(crossNode(model, c));
  return { start: start.end, end: end.end, nodes: [...new Set(nodes)] };
}

function build(
  model: Model,
  wall: Wall,
  src: ReturnType<typeof sources>,
  openings: readonly Opening[],
): WallJunction {
  const section = wallSection(model, wall);
  const gaps = [
    ...src.nodes.flatMap((n) => n.gaps.get(wall.id) ?? []),
    ...openingGaps(model, wall, openings),
  ];
  const empty: LayerEnd = { variants: [[]], extend: 0, extras: [] };
  const layers = section.layers.map((span, i) => {
    const s = src.start.layers[i] ?? empty;
    const e = src.end.layers[i] ?? empty;
    const band = bandPolygon(wall.path, Math.min(span.from, span.to), Math.max(span.from, span.to), {
      start: s.extend,
      end: e.extend,
    });
    return layerPieces(
      band,
      s,
      e,
      gaps.filter((g) => g.layer === i),
    );
  });
  return {
    joins: { start: src.start.join, end: src.end.join },
    ends: { start: src.start, end: src.end },
    layers,
    outlines: mergePieces(layers.flat()),
  };
}

const cache = new Map<string, { deps: readonly unknown[]; result: WallJunction }>();

/**
 * Napojení jedné stěny (z mezipaměti, když se vstupy nezměnily). `cutPlane` = rovina řezu pohledu nad
 * podlažím: otvory, které ji protínají, stěnu přeruší (Z4).
 */
export function wallJunction(model: Model, wall: Wall, cutPlane = DEFAULT_CUT_HEIGHT): WallJunction {
  const src = sources(model, wall);
  const openings = cuttingOpenings(model, wall, cutPlane);
  const deps: unknown[] = [
    wall,
    model.wallTypes[wall.typeId],
    model.materials,
    src.start,
    src.end,
    ...src.nodes,
  ];
  if (openings.length) deps.push(model.storeys, ...openings);
  const key = `${wall.id}|${cutPlane}`;
  const hit = cache.get(key);
  if (hit && hit.deps.length === deps.length && hit.deps.every((d, i) => d === deps[i])) return hit.result;
  if (cache.size > 20000) cache.clear();
  const result = build(model, wall, src, openings);
  cache.set(key, { deps, result });
  return result;
}
