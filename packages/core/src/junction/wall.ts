// Obrys každé vrstvy jedné stěny po napojení: pás vrstvy ∩ poloroviny obou konců − mezery (stěna jako
// hostitel v T, kříž, dvojice v uzlu, otvory v rovině řezu – Z4) + kousky navíc (zahnutá omítka).
// Kousky jedné vrstvy se slijí.
import {
  add,
  angleOf,
  arcData,
  arcPoints,
  mul,
  offsetPath,
  pathLength,
  sub,
  tangentAt,
  tessellate,
  type Path,
  type PathEnd,
  type Vec2,
} from '../geometry/index.ts';
import { stationAt } from '../opening/along.ts';
import type { Model } from '../model/types.ts';
import { openingGaps } from '../opening/jamb.ts';
import { cuttingOpenings } from '../opening/geometry.ts';
import type { Opening } from '../opening/types.ts';
import { DEFAULT_CUT_HEIGHT } from '../wall/layers.ts';
import { wallSection } from '../wall/queries.ts';
import type { Wall } from '../wall/types.ts';
import { unionLoops } from './chain.ts';
import { neighbours, subEdges } from './edges.ts';
import { clipAll, halfPlane, MIN_AREA, signedArea, type Cut } from './half-plane.ts';
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

const isArc = (p: Path): p is Extract<Path, { kind: 'arc' }> => p.kind === 'arc' && Math.abs(p.bulge) > 1e-9;

/**
 * Pás obloukové stěny (Z5): soustředné oblouky po společné mřížce, na koncích prodloužené po kružnici
 * (nejvýš 60° a tak, aby polovina pásu nepřesáhla 175° od středu stěny).
 */
function arcBand(path: Extract<Path, { kind: 'arc' }>, lo: number, hi: number, ext: Record<PathEnd, number>) {
  const a = arcData(path);
  const s = Math.sign(a.sweep);
  const a0 = angleOf(sub(path.start, a.center));
  const cap = Math.max(0, Math.min(Math.PI / 3, (175 * Math.PI) / 180 - Math.abs(a.sweep) / 2));
  const side = (o: number) => {
    const r = a.radius - s * o;
    const e0 = Math.min(cap, ext.start / Math.max(r, 1));
    const e1 = Math.min(cap, ext.end / Math.max(r, 1));
    return arcPoints(a.center, r, a0 - s * e0, a.sweep + s * (e0 + e1));
  };
  const poly = [...side(lo), ...side(hi).reverse()];
  return signedArea(poly) >= 0 ? poly : poly.reverse();
}

/** Pás mezi offsety `lo` a `hi`, na koncích prodloužený po tečně (proti směru hodin). */
export function bandPolygon(path: Path, lo: number, hi: number, ext: Record<PathEnd, number>): Vec2[] {
  if (isArc(path)) return arcBand(path, lo, hi, ext);
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

/**
 * U oblouku platí řezy každého konce jen pro jeho polovinu pásu (dělí ji přímka středem stěny), aby
 * přímka řezu neprořízla oblouk na druhé straně kružnice. U přímé stěny jedna polovina = celý pás.
 */
function halves(path: Path): [Cut[], Cut[]] {
  if (!isArc(path)) return [[], []];
  const st = stationAt(path, pathLength(path) / 2);
  const back = { x: -st.tangent.x, y: -st.tangent.y };
  return [[halfPlane(st.point, st.normal, back)], [halfPlane(st.point, st.normal, st.tangent)]];
}

/** Poloroviny „za začátkem“ a „před koncem“ referenční čáry (tělo stěny bez prodloužení). */
function bodyCuts(path: Path): [Cut, Cut] {
  const s = stationAt(path, 0);
  const e = stationAt(path, pathLength(path));
  return [halfPlane(s.point, s.normal, s.tangent), halfPlane(e.point, e.normal, mul(e.tangent, -1))];
}

/**
 * Části pásu po ořezu řezy konců; zahodí ty, které leží celé v prodloužení za koncem (řez kružnicí
 * může prodloužený pás protnout podruhé daleko za uzlem, Z5).
 */
function cutBand(band: Vec2[], cuts: readonly Cut[], body: readonly Cut[]): Vec2[][] {
  const parts = clipAll(band, cuts);
  return parts.length <= 1 ? parts : parts.filter((p) => clipAll(p, body).some(big));
}

function layerPieces(
  band: Vec2[],
  geo: { half: [Cut[], Cut[]]; body: [Cut, Cut] },
  s: LayerEnd,
  e: LayerEnd,
  gaps: readonly Gap[],
): Vec2[][] {
  let pieces: Vec2[][] = [];
  const { half, body } = geo;
  if (half[0].length) {
    for (const vs of s.variants) pieces.push(...cutBand(band, [...half[0], ...vs], [body[0]]));
    for (const ve of e.variants) pieces.push(...cutBand(band, [...half[1], ...ve], [body[1]]));
  } else
    for (const vs of s.variants)
      for (const ve of e.variants) pieces.push(...cutBand(band, [...vs, ...ve], body));
  pieces.push(...s.extras.map((p) => [...p]), ...e.extras.map((p) => [...p]));
  pieces = pieces.filter(big);
  for (const g of gaps) pieces = pieces.flatMap((p) => g.keep.flatMap((hs) => clipAll(p, hs))).filter(big);
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
  const geo = { half: halves(wall.path), body: bodyCuts(wall.path) };
  const layers = section.layers.map((span, i) => {
    const s = src.start.layers[i] ?? empty;
    const e = src.end.layers[i] ?? empty;
    const band = bandPolygon(wall.path, Math.min(span.from, span.to), Math.max(span.from, span.to), {
      start: s.extend,
      end: e.extend,
    });
    return layerPieces(
      band,
      geo,
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
