// Příkazy: posun, změna rozměrů a smazání otvoru (plán stěn Z4). Pohne se jen vybraný otvor (základ 25).
import { add, type Vec2 } from '../../geometry/index.ts';
import type { Id } from '../../ids/index.ts';
import type { Model } from '../../model/types.ts';
import { putOpenings } from '../../model/update.ts';
import { stationAt } from '../../opening/along.ts';
import { hostAt } from '../../opening/host-at.ts';
import { rehostOpenings } from '../../opening/rehost.ts';
import type { Opening } from '../../opening/types.ts';
import { deleteOpenings } from '../../rules/delete.ts';
import { wallOf } from '../lookup.ts';
import { S } from '../schema.ts';
import { defineCommand, fail } from '../types.ts';
import { OPENING_SIZE_PROPS, type OpeningSize } from './create.ts';
import { assertOpenings, OPENING_IDS, openingOf } from './shared.ts';

/** Otvor posunutý o vektor: střed se promítne na stěnu pod ním (může přejít na jinou stěnu). */
export function movedBy(model: Model, o: Opening, v: Vec2): Opening {
  const host = wallOf(model, o.hostId);
  const center = add(stationAt(host.path, o.offset + o.width / 2).point, v);
  const hit = hostAt(model, o.storeyId, center, o.hostId);
  if (!hit) return fail('invalid', 'Otvor musí ležet ve stěně');
  return { ...o, hostId: hit.wall.id, storeyId: hit.wall.storeyId, offset: hit.s - o.width / 2 };
}

export const openingMove = defineCommand<{ openingIds: Id[]; vector?: Vec2; distance?: number }>({
  name: 'opening.move',
  label: 'Posunout otvor',
  description:
    'Posune otvory: distance = o kolik mm po stěně (kladně ke konci stěny), nebo vector = posun v půdorysu ' +
    '(střed se promítne na stěnu pod ním, otvor může přejít na jinou stěnu). Stěna se nehýbe.',
  group: 'Otvor',
  params: S.object({ openingIds: OPENING_IDS, vector: S.point, distance: S.number('mm po stěně') }, [
    'openingIds',
  ]),
  run(model, p) {
    if (!p.vector && p.distance === undefined) fail('invalid-params', 'Chybí vector nebo distance');
    const moved = p.openingIds.map((id) => {
      const o = openingOf(model, id);
      return p.vector ? movedBy(model, o, p.vector) : { ...o, offset: o.offset + (p.distance ?? 0) };
    });
    return { model: assertOpenings(rehostOpenings(model, moved), p.openingIds) };
  },
});

export interface OpeningUpdateParams extends OpeningSize {
  openingIds: Id[];
  /** Co zůstane na místě při změně šířky: počátek, střed (výchozí), nebo konec. */
  anchor?: 'start' | 'center' | 'end';
}

function resized(o: Opening, p: OpeningUpdateParams): Opening {
  const width = p.width ?? o.width;
  const shift = p.anchor === 'start' ? 0 : p.anchor === 'end' ? o.width - width : (o.width - width) / 2;
  const { openingIds: _ids, anchor: _a, ...props } = p;
  return { ...o, ...props, width, offset: o.offset + shift };
}

export const openingUpdate = defineCommand<OpeningUpdateParams>({
  name: 'opening.update',
  label: 'Upravit otvor',
  description:
    'Změní rozměry a vlastnosti otvorů (šířka, výška, parapet, průchozí / nika, hloubka a strana niky, ' +
    'stav). Při změně šířky zůstane na místě střed (anchor: start / center / end).',
  group: 'Otvor',
  params: S.object(
    {
      openingIds: OPENING_IDS,
      anchor: S.enumOf(['start', 'center', 'end'], 'co zůstane'),
      ...OPENING_SIZE_PROPS,
    },
    ['openingIds'],
  ),
  run(model, p) {
    const ops = p.openingIds.map((id) => resized(openingOf(model, id), p));
    return { model: assertOpenings(putOpenings(model, ops), p.openingIds) };
  },
});

export const openingDelete = defineCommand<{ openingIds: Id[] }>({
  name: 'opening.delete',
  label: 'Smazat otvor',
  description: 'Smaže otvory i s kótami k jejich hranám; stěna se v místě otvoru zacelí.',
  group: 'Otvor',
  params: S.object({ openingIds: OPENING_IDS }, ['openingIds']),
  run(model, p) {
    p.openingIds.forEach((id) => openingOf(model, id));
    return { model: deleteOpenings(model, p.openingIds) };
  },
});
