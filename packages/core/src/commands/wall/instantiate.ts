// Vložení sady stěn (kopie, pole, zrcadlení, schránka): nové stěny, jejich vzájemná napojení
// a samočinné napojení volných konců na jiné stěny (roh na volném konci, T na líci).
import { endPoint, type Path } from '../../geometry/index.ts';
import type { Id, IdGenerator } from '../../ids/index.ts';
import type { HeightBinding } from '../../model/height.ts';
import { IFC_CLASS } from '../../model/categories.ts';
import type { Model, Status, VariantRef } from '../../model/types.ts';
import { putElements, putRelations } from '../../model/update.ts';
import type { ConnectionType, WallConnection } from '../../relation/types.ts';
import { connectionAt, inwardDir, isFreeEnd } from '../../wall/auto-connect.ts';
import { connectionsOf, endToType } from '../../wall/queries.ts';
import type { ReferenceLine, Wall, WallSide } from '../../wall/types.ts';
import { storeyOf, wallTypeOf } from '../lookup.ts';
import { assertPath } from './shared.ts';

/** Popis stěny bez id (obsah schránky). */
export interface WallSpec {
  typeId: Id;
  path: Path;
  side: WallSide;
  referenceLine: ReferenceLine;
  height?: HeightBinding;
  status?: Status;
  discipline?: string;
}

/** Napojení uvnitř sady: indexy stěn v sadě. */
export interface SpecConnection {
  relating: { index: number; at: ConnectionType };
  related: { index: number; at: ConnectionType };
}

export function specOf(w: Wall): WallSpec {
  return {
    typeId: w.typeId,
    path: w.path,
    side: w.side,
    referenceLine: w.referenceLine,
    height: w.height,
    status: w.status,
    discipline: w.discipline,
  };
}

/** Napojení mezi stěnami sady (jen ta, kde jsou obě strany v sadě). */
export function connectionsWithin(model: Model, ids: readonly Id[]): SpecConnection[] {
  const seen = new Set<Id>();
  const out: SpecConnection[] = [];
  for (const id of ids)
    for (const c of connectionsOf(model, id)) {
      const a = ids.indexOf(c.relating.wallId);
      const b = ids.indexOf(c.related.wallId);
      if (a < 0 || b < 0 || seen.has(c.id)) continue;
      seen.add(c.id);
      out.push({ relating: { index: a, at: c.relating.at }, related: { index: b, at: c.related.at } });
    }
  return out;
}

/** Volné konce nových stěn se napojí na volný konec jiné stěny (roh) nebo na její líc (T). */
function autoConnect(model: Model, newIds: readonly Id[], newId: IdGenerator): Model {
  let m = model;
  for (const id of newIds)
    for (const end of ['start', 'end'] as const) {
      const w = m.elements[id] as Wall;
      if (!isFreeEnd(m, id, end)) continue;
      const link = connectionAt(m, w.storeyId, endPoint(w.path, end), [id], inwardDir(w.path, end));
      if (!link) continue;
      const rel: WallConnection = {
        id: newId(),
        kind: 'wall-connection',
        relating: link,
        related: { wallId: id, at: endToType(end) },
      };
      m = putRelations(m, [rel]);
    }
  return m;
}

export interface InstantiateContext {
  readonly newId: IdGenerator;
  readonly variant: VariantRef;
}

/** Vloží stěny podle popisu do podlaží; vrací model a id nových stěn. */
export function instantiateWalls(
  model: Model,
  storeyId: Id,
  specs: readonly WallSpec[],
  conns: readonly SpecConnection[],
  ctx: InstantiateContext,
): { model: Model; ids: Id[] } {
  const storey = storeyOf(model, storeyId);
  const walls: Wall[] = specs.map((s) => {
    wallTypeOf(model, s.typeId);
    assertPath(s.path);
    return {
      id: ctx.newId(),
      ifcClass: IFC_CLASS.wall,
      category: 'wall',
      discipline: s.discipline ?? 'architecture',
      status: s.status ?? 'new',
      variant: ctx.variant,
      storeyId: storey.id,
      typeId: s.typeId,
      path: s.path,
      referenceLine: s.referenceLine,
      side: s.side,
      height: s.height ?? {
        baseStoreyId: storey.id,
        baseOffset: 0,
        top: { kind: 'height', value: storey.height },
      },
    };
  });
  const id = (i: number) => (walls[i] as Wall).id;
  const rels: WallConnection[] = conns.map((c) => ({
    id: ctx.newId(),
    kind: 'wall-connection',
    relating: { wallId: id(c.relating.index), at: c.relating.at },
    related: { wallId: id(c.related.index), at: c.related.at },
  }));
  const ids = walls.map((w) => w.id);
  const m = autoConnect(putRelations(putElements(model, walls), rels), ids, ctx.newId);
  return { model: m, ids };
}
