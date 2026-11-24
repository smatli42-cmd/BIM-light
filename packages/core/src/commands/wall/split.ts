// Příkaz: rozdělit stěnu v bodě na dvě samostatné stěny (katalog kreslení 5.3).
// Typ a výška se zdědí; napojení na konci přejde na druhou část; obě části se spojí rohem.
import { endPoint, pointAt, projectOnCarrier, carrierOf, type Vec2 } from '../../geometry/index.ts';
import { paramOf, splitPath } from '../../geometry/split.ts';
import type { Id } from '../../ids/index.ts';
import type { Model } from '../../model/types.ts';
import { putElements, putRelations } from '../../model/update.ts';
import type { WallConnection } from '../../relation/types.ts';
import { connectionsOf, typeToEnd } from '../../wall/queries.ts';
import type { Wall } from '../../wall/types.ts';
import { wallOf } from '../lookup.ts';
import { S } from '../schema.ts';
import { defineCommand, fail } from '../types.ts';

/** Přepojí vztahy původní stěny: konec → druhá část, T po délce → část, na které stěna leží. */
function reassign(model: Model, a: Wall, b: Wall, tSplit: number): WallConnection[] {
  const moveSide = (c: WallConnection, which: 'relating' | 'related'): WallConnection => ({
    ...c,
    [which]: { ...c[which], wallId: b.id },
  });
  const out: WallConnection[] = [];
  for (const c of connectionsOf(model, a.id)) {
    const which = c.relating.wallId === a.id ? 'relating' : 'related';
    const other = which === 'relating' ? c.related : c.relating;
    const own = c[which];
    if (own.at === 'ATEND') out.push(moveSide(c, which));
    if (own.at !== 'ATPATH') continue;
    const otherEnd = typeToEnd(other.at);
    if (!otherEnd) continue;
    const p = endPoint(wallOf(model, other.wallId).path, otherEnd);
    if (paramOf(a.path, p) > tSplit) out.push(moveSide(c, which));
  }
  return out;
}

export const wallSplit = defineCommand<{ wallId: Id; point: Vec2 }>({
  name: 'wall.split',
  label: 'Rozdělit',
  description: 'Rozdělí stěnu v bodě na dvě stěny spojené rohem; typ, výška a vlastnosti se zdědí.',
  group: 'Úpravy',
  shortcut: 'X',
  params: S.object({ wallId: S.id, point: S.point }, ['wallId', 'point']),
  run(model, p, ctx) {
    const w = wallOf(model, p.wallId);
    const at = projectOnCarrier(p.point, carrierOf(w.path));
    const t = paramOf(w.path, at);
    if (!(t > 0.001 && t < 0.999)) fail('invalid', 'Bod rozdělení musí ležet uvnitř stěny');
    const [pa, pb] = splitPath(w.path, pointAt(w.path, t));
    const a: Wall = { ...w, path: pa };
    const b: Wall = { ...w, id: ctx.newId(), path: pb };
    const moved = reassign(model, w, b, t);
    const join: WallConnection = {
      id: ctx.newId(),
      kind: 'wall-connection',
      relating: { wallId: a.id, at: 'ATEND' },
      related: { wallId: b.id, at: 'ATSTART' },
    };
    const m = putRelations(putElements(model, [a, b]), [...moved, join]);
    return { model: m, created: [b.id, join.id] };
  },
});
