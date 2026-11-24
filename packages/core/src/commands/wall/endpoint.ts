// Příkazy: posun uzlu (konce) a změna délky stěny (základ 25: pohne se uchopený konec).
import {
  arcData,
  cross,
  endPoint,
  mul,
  norm,
  pathLength,
  rotate,
  sub,
  tangentAt,
  translatePath,
  withEnd,
  type PathEnd,
  type Vec2,
} from '../../geometry/index.ts';
import type { Id } from '../../ids/index.ts';
import type { Model } from '../../model/types.ts';
import { putRelations } from '../../model/update.ts';
import type { ConnectionType } from '../../relation/types.ts';
import { wallGeometry } from '../../wall/geometry.ts';
import { connectionsOf, sidesFor, endToType, typeToEnd } from '../../wall/queries.ts';
import type { WallMotion } from '../../wall/propagate.ts';
import type { Wall, WallFace } from '../../wall/types.ts';
import { wallOf } from '../lookup.ts';
import { S, type JsonSchema } from '../schema.ts';
import { defineCommand, fail } from '../types.ts';
import { applyWallChanges, both, END_SCHEMA, oneEnd } from './shared.ts';

const CONNECT_TO: JsonSchema = S.object(
  { wallId: S.id, at: S.enumOf(['ATSTART', 'ATEND', 'ATPATH'], 'kam') },
  ['wallId', 'at'],
);

export interface MoveEndpointParams {
  wallId: Id;
  end: PathEnd;
  point: Vec2;
  /** Volný konec přitažený k uzlu jiné stěny se napojí (katalog kreslení 5). */
  connectTo?: { wallId: Id; at: ConnectionType };
}

export const wallMoveEndpoint = defineCommand<MoveEndpointParams>({
  name: 'wall.moveEndpoint',
  label: 'Posunout uzel',
  description:
    'Přesune konec stěny na bod. Stěny napojené v tomto rohu jdou s ním (roh zůstane uzavřený). ' +
    'connectTo = volný konec se napojí na jinou stěnu.',
  group: 'Úpravy',
  params: S.object({ wallId: S.id, end: END_SCHEMA, point: S.point, connectTo: CONNECT_TO }, [
    'wallId',
    'end',
    'point',
  ]),
  run(model, p, ctx) {
    const w = wallOf(model, p.wallId);
    const moved = { ...w, path: withEnd(w.path, p.end, p.point) };
    const m = applyWallChanges(model, [moved], new Map([[w.id, oneEnd(p.end, 'pinned')]]));
    if (!p.connectTo || p.connectTo.wallId === w.id) return { model: m };
    if (connectionsOf(m, w.id).some((c) => sidesFor(c, w.id).own.at === endToType(p.end)))
      return { model: m };
    wallOf(m, p.connectTo.wallId);
    const rel = {
      id: ctx.newId(),
      kind: 'wall-connection' as const,
      relating: { wallId: p.connectTo.wallId, at: p.connectTo.at },
      related: { wallId: w.id, at: endToType(p.end) },
    };
    return { model: putRelations(m, [rel]), created: [rel.id] };
  },
});

/** Nový konec po prodloužení o `delta` po směru stěny (u oblouku po kružnici). */
function extendedEnd(w: Wall, end: PathEnd, delta: number, faceRadius: number): Vec2 {
  const at = endPoint(w.path, end);
  if (w.path.kind === 'arc' && Math.abs(w.path.bulge) > 1e-9) {
    const a = arcData(w.path);
    const angle = (delta / faceRadius) * Math.sign(a.sweep) * (end === 'end' ? 1 : -1);
    return rotate(at, a.center, angle);
  }
  const dir = mul(tangentAt(w.path, end), end === 'end' ? delta : -delta);
  return { x: at.x + dir.x, y: at.y + dir.y };
}

/** Stěny napojené rohem na daný konec; kolmé se posunou s koncem (katalog kreslení 3.4). */
function cornerFollowers(model: Model, w: Wall, end: PathEnd, v: Vec2): Wall[] {
  const out: Wall[] = [];
  for (const c of connectionsOf(model, w.id)) {
    const { own, other } = sidesFor(c, w.id);
    if (own.at !== endToType(end) || typeToEnd(other.at) === null) continue;
    const x = wallOf(model, other.wallId);
    const parallel = Math.abs(cross(norm(sub(x.path.end, x.path.start)), norm(v))) < 0.02;
    if (!parallel) out.push({ ...x, path: translatePath(x.path, v) });
  }
  return out;
}

export interface SetLengthParams {
  wallId: Id;
  end: PathEnd;
  length: number;
  face?: WallFace;
}

/** Nastaví délku líce; pohne se konec `end` (uchopený). */
export function setWallLength(model: Model, p: SetLengthParams): Model {
  const w = wallOf(model, p.wallId);
  const face = wallGeometry(model, w).faces[p.face ?? 'ref'];
  const delta = p.length - pathLength(face);
  const radius = face.kind === 'arc' && Math.abs(face.bulge) > 1e-9 ? arcData(face).radius : 1;
  const newEnd = extendedEnd(w, p.end, delta, radius);
  const v = sub(newEnd, endPoint(w.path, p.end));
  if (!Number.isFinite(newEnd.x)) fail('invalid', 'Délku nelze nastavit');
  const moved = { ...w, path: withEnd(w.path, p.end, newEnd) };
  const followers = cornerFollowers(model, w, p.end, v);
  const motion = new Map<Id, WallMotion>([[w.id, oneEnd(p.end, 'pinned')]]);
  for (const f of followers) motion.set(f.id, both('free'));
  return applyWallChanges(model, [moved, ...followers], motion);
}

export const wallSetLength = defineCommand<SetLengthParams>({
  name: 'wall.setLength',
  label: 'Změnit délku',
  description:
    'Nastaví délku líce stěny (výchozí referenční líc). Pohne se zadaný (uchopený) konec; ' +
    'kolmá stěna napojená v tomto rohu jde s ním.',
  group: 'Úpravy',
  params: S.object(
    {
      wallId: S.id,
      end: END_SCHEMA,
      length: S.number('mm', { exclusiveMinimum: 0 }),
      face: S.enumOf(['ref', 'opp', 'axis'], 'měřený líc'),
    },
    ['wallId', 'end', 'length'],
  ),
  run: (model, p) => ({ model: setWallLength(model, p) }),
});
