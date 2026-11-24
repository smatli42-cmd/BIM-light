// Uzly z uložených napojení (základ 24): konce spojené vztahy konec–konec tvoří jeden uzel (roh, přímka,
// tři a více konců); konec na hostiteli = T; ATPATH–ATPATH = kříž. Napojení „nespojovat“ se přeskočí.
import { endPoint, type PathEnd } from '../geometry/index.ts';
import type { Id } from '../ids/index.ts';
import type { Model } from '../model/types.ts';
import type { WallConnection } from '../relation/types.ts';
import { connectionsOf, endToType, getWall, sidesFor, typeToEnd } from '../wall/queries.ts';
import { armKey } from './frame.ts';

export interface ArmRef {
  readonly wallId: Id;
  readonly end: PathEnd;
}

export type EndNode =
  | { readonly kind: 'free'; readonly key: string; readonly arm: ArmRef }
  | {
      readonly kind: 'tee';
      readonly key: string;
      readonly arm: ArmRef;
      readonly hostId: Id;
      readonly conn: WallConnection;
    }
  | {
      readonly kind: 'group';
      readonly key: string;
      readonly arms: readonly ArmRef[];
      readonly conns: readonly WallConnection[];
    };

const active = (c: WallConnection) => !c.noJoin;

/** Napojení na daném konci stěny (bez „nespojovat“). */
export const connectionsAtEnd = (model: Model, wallId: Id, end: PathEnd): WallConnection[] =>
  connectionsOf(model, wallId).filter((c) => active(c) && sidesFor(c, wallId).own.at === endToType(end));

/** Všechny konce spojené s daným koncem vztahy konec–konec (do hloubky). */
function endGroup(model: Model, start: ArmRef): { arms: ArmRef[]; conns: WallConnection[] } {
  const arms: ArmRef[] = [start];
  const conns = new Map<Id, WallConnection>();
  for (let i = 0; i < arms.length; i++) {
    const a = arms[i] as ArmRef;
    for (const c of connectionsAtEnd(model, a.wallId, a.end)) {
      const other = sidesFor(c, a.wallId).other;
      const e = typeToEnd(other.at);
      if (!e || !model.elements[other.wallId]) continue;
      conns.set(c.id, c);
      if (!arms.some((x) => x.wallId === other.wallId && x.end === e))
        arms.push({ wallId: other.wallId, end: e });
    }
  }
  return { arms, conns: [...conns.values()] };
}

/** Do jakého uzlu patří konec stěny. */
export function endNode(model: Model, wallId: Id, end: PathEnd): EndNode {
  const g = endGroup(model, { wallId, end });
  if (g.arms.length >= 2) {
    const key = g.arms
      .map((a) => armKey(a.wallId, a.end))
      .sort()
      .join('|');
    return { kind: 'group', key, arms: g.arms, conns: g.conns };
  }
  const tee = connectionsAtEnd(model, wallId, end).find((c) => sidesFor(c, wallId).other.at === 'ATPATH');
  const hostId = tee && sidesFor(tee, wallId).other.wallId;
  if (tee && hostId && model.elements[hostId]) {
    return { kind: 'tee', key: `T:${armKey(wallId, end)}`, arm: { wallId, end }, hostId, conn: tee };
  }
  return { kind: 'free', key: `F:${armKey(wallId, end)}`, arm: { wallId, end } };
}

/** Vztahy, ve kterých je stěna průběžná (hostitel T, kříž) – zdroje mezer. */
export function throughNodes(model: Model, wallId: Id): EndNode[] {
  const out: EndNode[] = [];
  for (const c of connectionsOf(model, wallId)) {
    const sd = sidesFor(c, wallId);
    if (!active(c) || sd.own.at !== 'ATPATH' || !model.elements[sd.other.wallId]) continue;
    const e = typeToEnd(sd.other.at);
    if (e === null) continue;
    const n = endNode(model, sd.other.wallId, e);
    if (n.kind === 'tee' && n.hostId === wallId) out.push(n);
  }
  return out;
}

/** Kříže (ATPATH–ATPATH), kterých se stěna účastní. */
export const crossings = (model: Model, wallId: Id): WallConnection[] =>
  connectionsOf(model, wallId).filter(
    (c) =>
      active(c) &&
      c.relating.at === 'ATPATH' &&
      c.related.at === 'ATPATH' &&
      !!model.elements[sidesFor(c, wallId).other.wallId],
  );

/** Bod konce (pro rámy). */
export const armPoint = (model: Model, a: ArmRef) => endPoint(getWall(model, a.wallId).path, a.end);
