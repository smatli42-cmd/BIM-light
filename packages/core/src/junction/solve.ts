// Výpočet uzlů s mezipamětí: výsledek se drží podle identity vstupů (stěny, typy, materiály, vztahy).
// Model je neměnný, takže nezměněný uzel má stejné vstupy a nepřepočítává se (základ 4: nic se neukládá).
import { pathIntersections, type PathEnd } from '../geometry/index.ts';
import type { Id } from '../ids/index.ts';
import type { Model } from '../model/types.ts';
import type { WallConnection } from '../relation/types.ts';
import { getWall, sidesFor } from '../wall/queries.ts';
import { solveCorner } from './corner.ts';
import { armKey, armOf, frameNear } from './frame.ts';
import { freeEnd } from './free-end.ts';
import { isCollinear, solveMulti, solveStraight } from './multi.ts';
import { endNode, type EndNode } from './nodes.ts';
import { solveCross, solveTee } from './tee.ts';
import type { EndResult, NodeResult } from './types.ts';

interface Entry {
  readonly deps: readonly unknown[];
  readonly result: NodeResult;
}

const cache = new Map<string, Entry>();
const MAX_CACHE = 20000;

function depsOf(model: Model, wallIds: readonly Id[], conns: readonly WallConnection[]): unknown[] {
  const walls = wallIds.map((id) => model.elements[id]);
  const types = walls.map((w) => (w ? model.wallTypes[w.typeId] : undefined));
  return [model.materials, ...walls, ...types, ...conns];
}

function cached(key: string, deps: readonly unknown[], run: () => NodeResult): NodeResult {
  const hit = cache.get(key);
  if (hit && hit.deps.length === deps.length && hit.deps.every((d, i) => d === deps[i])) return hit.result;
  if (cache.size > MAX_CACHE) cache.clear();
  const result = run();
  cache.set(key, { deps, result });
  return result;
}

function solveNode(model: Model, node: EndNode): NodeResult {
  if (node.kind === 'free') {
    const { wallId: id, end } = node.arm;
    return cached(node.key, depsOf(model, [id], []), () => ({
      ends: new Map([[armKey(id, end), freeEnd(armOf(model, getWall(model, id), end))]]),
      gaps: new Map(),
    }));
  }
  if (node.kind === 'tee') {
    const deps = depsOf(model, [node.arm.wallId, node.hostId], [node.conn]);
    return cached(node.key, deps, () => {
      const j = armOf(model, getWall(model, node.arm.wallId), node.arm.end);
      return solveTee(j, frameNear(model, getWall(model, node.hostId), j.origin));
    });
  }
  const deps = depsOf(
    model,
    node.arms.map((a) => a.wallId),
    node.conns,
  );
  return cached(node.key, deps, () => {
    const arms = node.arms.map((a) => armOf(model, getWall(model, a.wallId), a.end));
    const [a, b] = arms;
    if (arms.length === 2 && a && b) return isCollinear(a, b) ? solveStraight(a, b) : solveCorner(a, b);
    return solveMulti(arms);
  });
}

/** Výsledek konce stěny (druh napojení a ořez každé vrstvy) + uzel, ze kterého pochází. */
export function endResult(model: Model, wallId: Id, end: PathEnd): { end: EndResult; node: NodeResult } {
  const node = solveNode(model, endNode(model, wallId, end));
  const res = node.ends.get(armKey(wallId, end));
  if (res) return { end: res, node };
  const free = solveNode(model, { kind: 'free', key: `F:${armKey(wallId, end)}`, arm: { wallId, end } });
  return { end: free.ends.get(armKey(wallId, end)) as EndResult, node: free };
}

/** Uzel T, ve kterém je stěna hostitelem. */
export const teeNode = (model: Model, node: EndNode): NodeResult => solveNode(model, node);

/** Kříž dvou stěn (prázdný, když se stěny neprotínají). */
export function crossNode(model: Model, c: WallConnection): NodeResult {
  const deps = depsOf(model, [c.relating.wallId, c.related.wallId], [c]);
  return cached(`X:${c.id}`, deps, () => {
    const a = getWall(model, c.relating.wallId);
    const b = getWall(model, c.related.wallId);
    const at = pathIntersections(a.path, b.path)[0];
    if (!at) return { ends: new Map(), gaps: new Map() };
    return solveCross(frameNear(model, a, at), frameNear(model, b, at));
  });
}

/** Druhá stěna kříže. */
export const crossOther = (c: WallConnection, wallId: Id): Id => sidesFor(c, wallId).other.wallId;
