// Vložení sady stěn (kopie, pole, zrcadlení, schránka): nové stěny, jejich vzájemná napojení
// a samočinné napojení volných konců na jiné stěny (roh na volném konci, T na líci).
import { endPoint, type Path } from '../../geometry/index.ts';
import type { Id, IdGenerator } from '../../ids/index.ts';
import type { HeightBinding } from '../../model/height.ts';
import { FLAT_TOP, type TopProfile } from '../../wall-height/top-profile.ts';
import { IFC_CLASS } from '../../model/categories.ts';
import type { Model, Status, VariantRef } from '../../model/types.ts';
import { putElements, putOpenings, putRelations } from '../../model/update.ts';
import { openingFromSpec, openingSpecsOf, type OpeningSpec } from '../../opening/spec.ts';
import type { ConnectionType, WallConnection } from '../../relation/types.ts';
import { connectionAt, inwardDir, isFreeEnd } from '../../wall/auto-connect.ts';
import { connectionsOf, endToType } from '../../wall/queries.ts';
import type { ReferenceLine, Wall, WallSide } from '../../wall/types.ts';
import { storeyOf, wallTypeOf } from '../lookup.ts';
import { assertPath, placedHeight } from './shared.ts';
import { withCrossings } from './create.ts';

/** Popis stěny bez id (obsah schránky). */
export interface WallSpec {
  typeId: Id;
  path: Path;
  side: WallSide;
  referenceLine: ReferenceLine;
  height?: HeightBinding;
  topProfile?: TopProfile;
  status?: Status;
  discipline?: string;
  /** Otvory stěny (jdou s ní při kopii, zrcadlení, poli i vložení, Z4). */
  openings?: OpeningSpec[];
}

/** Napojení uvnitř sady: indexy stěn v sadě. */
export interface SpecConnection {
  relating: { index: number; at: ConnectionType };
  related: { index: number; at: ConnectionType };
}

/** Popis stěny; s modelem i s jejími otvory. */
export function specOf(w: Wall, model?: Model): WallSpec {
  const openings = model ? openingSpecsOf(model, w.id) : [];
  return {
    ...(openings.length ? { openings } : {}),
    typeId: w.typeId,
    path: w.path,
    side: w.side,
    referenceLine: w.referenceLine,
    height: w.height,
    topProfile: w.topProfile,
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

/** Volné konce nových stěn se napojí na volný konec jiné stěny (roh) nebo na její líc (T); stěny, které nová protíná, křížem. */
function autoConnect(model: Model, newIds: readonly Id[], newId: IdGenerator): Model {
  let m = model;
  for (const id of newIds)
    for (const end of ['start', 'end'] as const) {
      const w = m.elements[id] as Wall;
      if (!isFreeEnd(m, id, end)) continue;
      const at = endPoint(w.path, end);
      const link = connectionAt(m, w.storeyId, at, [id], inwardDir(w.path, end), w.status);
      if (!link) continue;
      const rel: WallConnection = {
        id: newId(),
        kind: 'wall-connection',
        relating: link,
        related: { wallId: id, at: endToType(end) },
      };
      m = putRelations(m, [rel]);
    }
  for (const id of newIds) m = withCrossings(m, m.elements[id] as Wall, newId);
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
      height: placedHeight(model, storey.id, s.height),
      topProfile: s.topProfile ?? FLAT_TOP,
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
  const openings = walls.flatMap((w, i) =>
    (specs[i]?.openings ?? []).map((o) => openingFromSpec(o, w, ctx.newId, ctx.variant)),
  );
  const placed = putOpenings(putRelations(putElements(model, walls), rels), openings);
  const m = autoConnect(placed, ids, ctx.newId);
  return { model: m, ids };
}
