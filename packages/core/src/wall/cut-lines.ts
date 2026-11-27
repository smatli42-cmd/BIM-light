// Čáry řezaných konstrukcí (základy 5, 11; plán stěn Z2, Z6): obrys sjednocený přes sousední prvky, hranice
// vrstev mezi různými materiály, při jemné podrobnosti hranice nosného jádra perem řezu. Společné pro
// půdorys stěn i řez (stěny a desky po vrstvách). Pero, barva a typ čáry jen z funkce grafiky.
import type { Primitive, Stroke } from '../drawing/primitives.ts';
import { chain } from '../junction/chain.ts';
import { neighbours, subEdges, type SubEdge } from '../junction/edges.ts';
import type { Vec2 } from '../geometry/index.ts';
import type { Id } from '../ids/index.ts';
import type { Detail, ResolvedEffect } from '../style/types.ts';
import { onCap } from './draw-extras.ts';

/** Prvek s výslednou grafikou; `hiddenCaps` = úsečky obrysu, které se nekreslí (čela bez endLines). */
export interface CutLineItem {
  readonly elementId: Id;
  readonly g: ResolvedEffect;
  readonly hiddenCaps: readonly [Vec2, Vec2][];
}

/** Jeden mnohoúhelník vrstvy: ke kterému prvku a vrstvě patří. */
export interface CutLinePiece {
  readonly polygon: readonly Vec2[];
  readonly item: number;
  readonly layer: number;
  readonly materialId: Id;
  readonly core: boolean;
}

type Role = 'obrys' | 'hranice vrstvy' | 'hranice jádra';

/** Co se kreslí na dílčí hraně: obrys (za ní nic), hranice vrstvy (jiný materiál), nebo nic. */
function roleOf(p: CutLinePiece, q: CutLinePiece | null, detail: Detail, emitter: boolean, merge: boolean) {
  if (!q) return 'obrys';
  if (detail === 'coarse' || !emitter) return null;
  if (q.item === p.item && q.layer === p.layer) return null;
  if (merge && q.item !== p.item && q.materialId === p.materialId) return null;
  return detail === 'fine' && p.core !== q.core ? 'hranice jádra' : 'hranice vrstvy';
}

/** Čáry všech prvků najednou; `merge` = stejný materiál sousedních prvků bez dělicí čáry. */
export function drawCutLines(
  items: readonly CutLineItem[],
  pieces: readonly CutLinePiece[],
  detail: Detail,
  merge = true,
): Primitive[] {
  const set = subEdges(pieces.map((p) => p.polygon));
  const nb = neighbours(set);
  const isHiddenCap = (e: SubEdge) =>
    ((items[(pieces[e.owner] as CutLinePiece).item] as CutLineItem).hiddenCaps ?? []).some((c) =>
      onCap(set.points[e.ia] as Vec2, set.points[e.ib] as Vec2, c),
    );
  // Čáry se stejným perem, barvou a typem se skládají přes prvky: roh je jedna souvislá čára.
  const groups = new Map<string, { stroke: Stroke; role: Role; edges: SubEdge[] }>();
  set.edges.forEach((e, i) => {
    const j = nb[i] ?? -1;
    const other = j >= 0 ? (set.edges[j] as SubEdge).owner : -1;
    const p = pieces[e.owner] as CutLinePiece;
    const role = roleOf(
      p,
      other >= 0 ? (pieces[other] as CutLinePiece) : null,
      detail,
      e.owner < other,
      merge,
    );
    if (!role || (role === 'obrys' && isHiddenCap(e))) return;
    const { g } = items[p.item] as CutLineItem;
    const stroke: Stroke = {
      pen: role === 'hranice vrstvy' ? g.layerPen : g.cutPen,
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
      const owner = pieces[(edges[run.first] as SubEdge).owner] as CutLinePiece;
      const elementId = (items[owner.item] as CutLineItem).elementId;
      out.push({ kind: 'line', points: run.points, closed: run.closed, stroke, source: { elementId, role } });
    }
  }
  return out;
}
