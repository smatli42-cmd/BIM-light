// Příkaz: rozdělit stěnu v bodě na dvě samostatné stěny (katalog kreslení 5.3).
// Typ a výška se zdědí; napojení na konci přejde na druhou část; obě části se spojí rohem.
// Otvory za bodem rozdělení přejdou na druhou část; rozdělení přes otvor se odmítne (Z4).
import {
  endPoint,
  pathLength,
  pointAt,
  projectOnCarrier,
  carrierOf,
  type Vec2,
} from '../../geometry/index.ts';
import { openingsOf } from '../../opening/geometry.ts';
import { rehostOpenings } from '../../opening/rehost.ts';
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

/** Části dráhy před a za rozdělením; s mezerou `gap` (mm) se mezi nimi vynechá úsek. */
function parts(w: Wall, sSplit: number, gap: number): [Wall['path'], Wall['path'], number] {
  const len = pathLength(w.path);
  const [s0, s1] = [sSplit - gap / 2, sSplit + gap / 2];
  if (s0 < 1 || s1 > len - 1) fail('invalid', 'Mezera je delší než stěna po obou stranách bodu');
  const [pa, rest] = splitPath(w.path, pointAt(w.path, s0 / len));
  const pb = gap > 0 ? splitPath(rest, pointAt(w.path, s1 / len))[1] : rest;
  return [pa, pb, s1];
}

export const wallSplit = defineCommand<{ wallId: Id; point: Vec2; gap?: number }>({
  name: 'wall.split',
  label: 'Rozdělit',
  description:
    'Rozdělí stěnu v bodě na dvě stěny spojené rohem; typ, výška a vlastnosti se zdědí. S mezerou „gap“ ' +
    '(mm, jako Split with Gap v Revitu) se kolem bodu vynechá úsek a části zůstanou nespojené.',
  group: 'Úpravy',
  shortcut: 'X',
  params: S.object(
    {
      wallId: S.id,
      point: S.point,
      gap: S.number('mezera mezi částmi (mm), 0 = bez mezery', { minimum: 0 }),
    },
    ['wallId', 'point'],
  ),
  run(model, p, ctx) {
    const w = wallOf(model, p.wallId);
    const at = projectOnCarrier(p.point, carrierOf(w.path));
    const t = paramOf(w.path, at);
    if (!(t > 0.001 && t < 0.999)) fail('invalid', 'Bod rozdělení musí ležet uvnitř stěny');
    const gap = p.gap ?? 0;
    const sSplit = t * pathLength(w.path);
    const ops = openingsOf(model, w.id);
    if (ops.some((o) => o.offset < sSplit + gap / 2 && o.offset + o.width > sSplit - gap / 2))
      fail('invalid', 'Stěnu nejde rozdělit přes otvor; posuňte bod rozdělení mimo otvor');
    const [pa, pb, sB] = parts(w, sSplit, gap);
    const a: Wall = { ...w, path: pa };
    const b: Wall = { ...w, id: ctx.newId(), path: pb };
    const rehosted = ops
      .filter((o) => o.offset >= sSplit)
      .map((o) => ({ ...o, hostId: b.id, offset: o.offset - sB }));
    const moved = reassign(model, w, b, t);
    const join: WallConnection[] =
      gap > 0
        ? []
        : [
            {
              id: ctx.newId(),
              kind: 'wall-connection',
              relating: { wallId: a.id, at: 'ATEND' },
              related: { wallId: b.id, at: 'ATSTART' },
            },
          ];
    const m = rehostOpenings(putRelations(putElements(model, [a, b]), [...moved, ...join]), rehosted);
    return { model: m, created: [b.id, ...join.map((j) => j.id)] };
  },
});
