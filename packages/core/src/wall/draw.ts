// Generátor půdorysu stěn (základy 5, 11; katalog pohledů: „Stěna: smlouva s kreslením“; plán stěn Z2).
// Stěna nevolí barvu, šrafu ani pero sama: vše dostane z funkce grafiky.
// Hrubá: sjednocený obrys všech viditelných stěn + jedna výplň. Střední (a zatím jemná): navíc vrstvy
// po napojení se šrafou materiálu a čáry mezi různými materiály. Mezi stejnými materiály se nekreslí.
import type { Primitive, Stroke } from '../drawing/primitives.ts';
import { chain } from '../junction/chain.ts';
import { neighbours, subEdges, type SubEdge } from '../junction/edges.ts';
import type { Id } from '../ids/index.ts';
import type { Detail, ResolvedEffect } from '../style/types.ts';
import { layerHatch, type DrawLookup } from './draw-hatch.ts';
import type { WallGeometry } from './geometry.ts';

export interface WallDrawItem {
  readonly geom: WallGeometry;
  /** Výsledná grafika stěny (funkce grafiky); neviditelné stěny se sem nedávají. */
  readonly g: ResolvedEffect;
}

/** Výplň a šrafy jedné stěny. */
export function drawWallFills(item: WallDrawItem, detail: Detail, look: DrawLookup): Primitive[] {
  const { geom, g } = item;
  const id = geom.wallId;
  const out: Primitive[] = [];
  if (g.fillColor !== null) {
    for (const polygon of geom.outlines)
      out.push({
        kind: 'fill',
        polygon,
        color: g.fillColor,
        transparency: g.transparency,
        source: { elementId: id, role: 'výplň' },
      });
  }
  if (detail !== 'coarse') {
    for (const layer of geom.layers)
      for (const p of layer.polygons) out.push(...layerHatch(layer, p, g, look, id));
  }
  return out;
}

interface Piece {
  readonly item: number;
  readonly layer: number;
  readonly materialId: Id;
}

type Role = 'obrys' | 'hranice vrstvy';

/** Co se kreslí na dílčí hraně: obrys (za ní nic), hranice vrstvy (jiný materiál), nebo nic. */
function roleOf(p: Piece, q: Piece | null, detail: Detail, emitter: boolean): Role | null {
  if (!q) return 'obrys';
  if (detail === 'coarse' || !emitter) return null;
  if (q.item === p.item && q.layer === p.layer) return null;
  if (q.item !== p.item && q.materialId === p.materialId) return null;
  return 'hranice vrstvy';
}

/** Čáry všech stěn najednou (obrys sjednocený přes napojené stěny). */
export function drawWallLines(items: readonly WallDrawItem[], detail: Detail): Primitive[] {
  const pieces: Piece[] = [];
  const polys = items.flatMap((it, item) =>
    it.geom.layers.flatMap((l, layer) =>
      l.polygons.map((poly) => {
        pieces.push({ item, layer, materialId: l.span.layer.materialId });
        return poly;
      }),
    ),
  );
  const set = subEdges(polys);
  const nb = neighbours(set);
  // Čáry se stejným perem, barvou a typem se skládají přes stěny: roh je jedna souvislá čára.
  const groups = new Map<string, { stroke: Stroke; role: Role; edges: SubEdge[] }>();
  set.edges.forEach((e, i) => {
    const j = nb[i] ?? -1;
    const other = j >= 0 ? (set.edges[j] as SubEdge).owner : -1;
    const p = pieces[e.owner] as Piece;
    const role = roleOf(p, other >= 0 ? (pieces[other] as Piece) : null, detail, e.owner < other);
    if (!role) return;
    const { g } = items[p.item] as WallDrawItem;
    const stroke: Stroke = {
      pen: role === 'obrys' ? g.cutPen : g.layerPen,
      color: g.lineColor,
      lineType: g.lineType,
    };
    const k = `${role}|${stroke.pen}|${stroke.color}|${stroke.lineType}`;
    const grp = groups.get(k) ?? { stroke, role, edges: [] };
    grp.edges.push(e);
    groups.set(k, grp);
  });
  const out: Primitive[] = [];
  for (const { stroke, role, edges } of groups.values()) {
    for (const run of chain(set, edges)) {
      const owner = pieces[(edges[run.first] as SubEdge).owner] as Piece;
      const elementId = (items[owner.item] as WallDrawItem).geom.wallId;
      out.push({ kind: 'line', points: run.points, closed: run.closed, stroke, source: { elementId, role } });
    }
  }
  return out;
}

/** Kresba stěn: výplně a šrafy, potom čáry. */
export function drawWalls(items: readonly WallDrawItem[], detail: Detail, look: DrawLookup): Primitive[] {
  return [...items.flatMap((it) => drawWallFills(it, detail, look)), ...drawWallLines(items, detail)];
}
