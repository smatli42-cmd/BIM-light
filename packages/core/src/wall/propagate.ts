// Přizpůsobení napojených stěn po změně (základy 24, 25).
// Pohne se jen to, co příkaz změnil („řidiči“); stěny s uloženým vztahem se natáhnou, nic dalšího.
import {
  carrierOf,
  distanceToCarrier,
  endPoint,
  intersectNearest,
  withEnd,
  type Carrier,
  type PathEnd,
} from '../geometry/index.ts';
import type { Id } from '../ids/index.ts';
import type { Model } from '../model/types.ts';
import { omitIds } from '../model/update.ts';
import { connectionsOf, sidesFor, typeToEnd } from './queries.ts';
import type { Wall } from './types.ts';

/**
 * Jak se pohnul konec stěny:
 * - `none`: nepohnul;
 * - `free`: stěna se posunula / odsadila, konec smí klouzat po své přímce k napojené stěně;
 * - `pinned`: konec byl položen na přesné místo (tažení uzlu), napojené konce jdou za ním.
 */
export type EndMotion = 'none' | 'free' | 'pinned';
export type WallMotion = Readonly<Record<PathEnd, EndMotion>>;

const TOL = 0.5;

class Draft {
  readonly walls = new Map<Id, Wall>();
  readonly removedRelations = new Set<Id>();
  constructor(readonly model: Model) {}
  wall(id: Id): Wall {
    const w = this.walls.get(id) ?? this.model.elements[id];
    if (!w) throw new Error(`Stěna ${id} neexistuje`);
    return w;
  }
  setEnd(id: Id, end: PathEnd, p: { x: number; y: number }) {
    const w = this.wall(id);
    this.walls.set(id, { ...w, path: withEnd(w.path, end, p) });
  }
  result(): Model {
    const elements = { ...this.model.elements };
    for (const [id, w] of this.walls) elements[id] = w;
    return { ...this.model, elements, relations: omitIds(this.model.relations, this.removedRelations) };
  }
}

/** Posune konec stěny po její nosné čáře na cílovou čáru. Vrací true, když se pohnul. */
function slide(d: Draft, id: Id, end: PathEnd, target: Carrier): boolean {
  const w = d.wall(id);
  const p = intersectNearest(carrierOf(w.path), target, endPoint(w.path, end));
  if (!p) return false;
  d.setEnd(id, end, p);
  return true;
}

/** Zpracuje jeden vztah z pohledu stěny `id`, která se pohnula. Vrací konec druhé stěny, který se změnil. */
function follow(d: Draft, id: Id, motion: WallMotion, connId: Id, fixed: Set<Id>): [Id, PathEnd] | null {
  const conn = d.model.relations[connId];
  if (!conn) return null;
  const { own, other } = sidesFor(conn, id);
  if (fixed.has(other.wallId)) return null;
  const ownEnd = typeToEnd(own.at);
  const otherEnd = typeToEnd(other.at);
  const w = d.wall(id);
  if (ownEnd === null) {
    // Já jsem hostitel (T): konec druhé stěny se natáhne k mé nové poloze.
    return otherEnd && slide(d, other.wallId, otherEnd, carrierOf(w.path)) ? [other.wallId, otherEnd] : null;
  }
  const m = motion[ownEnd];
  if (m === 'none') return null;
  const x = d.wall(other.wallId);
  if (otherEnd === null) {
    // Můj konec leží na nepohnuté stěně (T): klouže k ní, nebo se při tažení mimo vztah zruší.
    if (m === 'free') slide(d, id, ownEnd, carrierOf(x.path));
    else if (distanceToCarrier(endPoint(w.path, ownEnd), carrierOf(x.path)) > TOL)
      d.removedRelations.add(conn.id);
    return null;
  }
  // Roh: společný bod.
  let p = endPoint(w.path, ownEnd);
  if (m === 'free') {
    const hit = intersectNearest(carrierOf(w.path), carrierOf(x.path), p);
    if (hit) {
      p = hit;
      d.setEnd(id, ownEnd, p);
    }
  }
  d.setEnd(other.wallId, otherEnd, p);
  return [other.wallId, otherEnd];
}

/**
 * Po změně stěn (řidičů) natáhne napojené stěny podle uložených vztahů.
 * Každá navazující stěna se změní nejvýš jednou; řidiči se už nehýbou jinak, než určil příkaz
 * (kromě sklouznutí volného konce k hostiteli).
 */
export function propagateConnections(model: Model, drivers: ReadonlyMap<Id, WallMotion>): Model {
  const d = new Draft(model);
  const motions = new Map(drivers);
  const fixed = new Set(drivers.keys());
  const queue = [...drivers.keys()];
  while (queue.length > 0) {
    const id = queue.shift() as Id;
    const motion = motions.get(id) ?? { start: 'none', end: 'none' };
    for (const conn of connectionsOf(model, id)) {
      const changed = follow(d, id, motion, conn.id, fixed);
      if (!changed) continue;
      const [otherId, end] = changed;
      fixed.add(otherId);
      motions.set(otherId, { start: 'none', end: 'none', [end]: 'pinned' });
      queue.push(otherId);
    }
  }
  return d.result();
}
