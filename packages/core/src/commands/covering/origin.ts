// Posun počátku spárořezu (prvky stavby 9, základ 14): uloží se v místnosti jako posun vůči bodu
// zarovnání typu (roh / střed / osa) pro podlahu, strop, nebo líc stěny (wallId + strana). Logicky,
// ne souřadnicí – změna stěn a otvorů spárořez přepočítá a posun zůstane.
import { FACE_SIDES, faceKey, type FaceSide } from '../../covering/types.ts';
import type { Id } from '../../ids/index.ts';
import { putRooms } from '../../model/update.ts';
import { roomOf } from '../room/room.ts';
import { S } from '../schema.ts';
import { defineCommand, fail } from '../types.ts';

export const coveringSetOrigin = defineCommand<{
  roomId: Id;
  place: 'floor' | 'ceiling' | 'wall';
  wallId?: Id;
  side?: FaceSide;
  offset: { x: number; y: number } | null;
}>({
  name: 'covering.setOrigin',
  label: 'Počátek spárořezu',
  description:
    'Posune počátek spárořezu obkladu / dlažby vůči bodu zarovnání typu (od rohu = levý dolní roh plochy, ' +
    'na střed / na osu = střed plochy). offset = {x, y} v mm v rovině plochy (podlaha: x, y půdorysu; ' +
    'stěna: x po líci, y nahoru), null = bez posunu. Plochu určí place (floor / ceiling / wall) a u stěny ' +
    'wallId + side. Řezy se hned přepočítají (dotaz covering.tiles).',
  group: 'Povrchy',
  params: S.object(
    {
      roomId: S.id,
      place: S.enumOf(['floor', 'ceiling', 'wall'], 'podlaha, strop, líc stěny'),
      wallId: S.id,
      side: S.enumOf(FACE_SIDES, 'strana stěny (ref / opp / start / end)'),
      offset: { oneOf: [S.point, { type: 'null' }], description: 'posun (mm); null = zrušit' },
    },
    ['roomId', 'place', 'offset'],
  ),
  run(model, p) {
    const room = roomOf(model, p.roomId);
    if (p.place === 'wall') {
      if (!p.wallId || !p.side) fail('invalid-params', 'U stěny chybí wallId a side');
      if (model.elements[p.wallId]?.category !== 'wall') fail('not-found', `Stěna ${p.wallId} neexistuje`);
    } else if (p.wallId) fail('invalid-params', 'wallId jde zadat jen u place = wall');
    const key = p.place === 'wall' ? faceKey(p.wallId as Id, p.side as FaceSide) : p.place;
    const c = room.coverings ?? {};
    const { [key]: _old, ...rest } = c.tileOrigins ?? {};
    const off = p.offset && (Math.abs(p.offset.x) > 1e-6 || Math.abs(p.offset.y) > 1e-6) ? p.offset : null;
    const tileOrigins = off ? { ...rest, [key]: { x: off.x, y: off.y } } : rest;
    return { model: putRooms(model, [{ ...room, coverings: { ...c, tileOrigins } }]) };
  },
});
