// Přiřazení úprav povrchů (prvky stavby 9, základ 14): logicky místnost + stěna + strana + výšková zóna,
// nebo místnost + podlaha / strop. Nic se neváže na souřadnice, takže posun stěny přiřazení nezničí.
import {
  faceKey,
  FACE_SIDES,
  type CoveringZone,
  type RoomCoverings,
  type FaceSide,
} from '../../covering/types.ts';
import { zonesError } from '../../covering/zones.ts';
import type { Id } from '../../ids/index.ts';
import type { Model } from '../../model/types.ts';
import { putRooms } from '../../model/update.ts';
import { S, type JsonSchema } from '../schema.ts';
import { defineCommand, fail } from '../types.ts';
import { roomOf } from '../room/room.ts';

const GROUP = 'Povrchy';
const TYPE_ID: JsonSchema = { oneOf: [S.id, { type: 'null' }], description: 'typ úpravy; null = bez úpravy' };
const SIDE = S.enumOf(FACE_SIDES, 'strana stěny: ref / opp = líc, start / end = čelo volného konce');
const ZONES: JsonSchema = {
  type: 'array',
  description: 'zóny odspodu nahoru; top = horní hrana nad čistou podlahou (mm), null = až ke stropu',
  items: S.object({ typeId: TYPE_ID, top: { oneOf: [{ type: 'number', minimum: 1 }, { type: 'null' }] } }, [
    'typeId',
    'top',
  ]),
};

function checkType(m: Model, id: Id | null) {
  if (id && !m.coveringTypes[id]) fail('not-found', `Typ úpravy ${id} neexistuje`);
}

function checkWall(m: Model, wallId: Id | undefined, side: FaceSide | undefined) {
  if (wallId === undefined) return;
  if (!m.elements[wallId] || m.elements[wallId].category !== 'wall')
    fail('not-found', `Stěna ${wallId} neexistuje`);
  if (!side) fail('invalid-params', 'U stěny chybí strana (side)');
}

function setCoverings(m: Model, roomId: Id, change: (c: RoomCoverings) => RoomCoverings): Model {
  const r = roomOf(m, roomId);
  return putRooms(m, [{ ...r, coverings: change(r.coverings ?? {}) }]);
}

function withOverride(c: RoomCoverings, key: string, zones: readonly CoveringZone[] | null): RoomCoverings {
  const { [key]: _old, ...rest } = c.wallOverrides ?? {};
  return { ...c, wallOverrides: zones ? { ...rest, [key]: zones } : rest };
}

export const coveringSetZones = defineCommand<{
  roomId: Id;
  zones: CoveringZone[] | null;
  wallId?: Id;
  side?: FaceSide;
}>({
  name: 'covering.setZones',
  label: 'Výškové zóny stěn',
  description:
    'Nastaví výškové zóny úprav stěn místnosti odspodu nahoru, např. [{typeId: obklad, top: 1500}, ' +
    '{typeId: malba, top: null}]. Bez wallId platí pro celou místnost; s wallId a side jen pro jednu stěnu ' +
    '(přepis). zones: null s wallId přepis zruší (stěna zase bere zóny místnosti).',
  group: GROUP,
  params: S.object({ roomId: S.id, zones: { oneOf: [ZONES, { type: 'null' }] }, wallId: S.id, side: SIDE }, [
    'roomId',
    'zones',
  ]),
  run(model, p) {
    checkWall(model, p.wallId, p.side);
    if (p.zones) {
      const err = zonesError(p.zones);
      if (err) fail('invalid', err);
      p.zones.forEach((z) => checkType(model, z.typeId));
    } else if (!p.wallId) fail('invalid-params', 'Zóny místnosti nejde zrušit, jen nastavit');
    const zones = p.zones?.map((z) => ({ typeId: z.typeId, top: z.top })) ?? null;
    return {
      model: setCoverings(model, p.roomId, (c) =>
        p.wallId
          ? withOverride(c, faceKey(p.wallId, p.side as FaceSide), zones)
          : { ...c, wallZones: zones ?? [] },
      ),
    };
  },
});

export const coveringAssign = defineCommand<{
  roomId: Id;
  place: 'walls' | 'floor' | 'ceiling';
  typeId: Id | null;
  wallId?: Id;
  side?: FaceSide;
}>({
  name: 'covering.assign',
  label: 'Přiřadit úpravu povrchu',
  description:
    'Přiřadí typ úpravy podlaze, stropu, nebo stěnám místnosti celou výškou (jedna zóna). U stěn s wallId ' +
    'a side jen jedné stěně (přepis). typeId null = bez úpravy.',
  group: GROUP,
  params: S.object(
    {
      roomId: S.id,
      place: S.enumOf(['walls', 'floor', 'ceiling'], 'stěny, podlaha, strop'),
      typeId: TYPE_ID,
      wallId: S.id,
      side: SIDE,
    },
    ['roomId', 'place', 'typeId'],
  ),
  run(model, p) {
    checkType(model, p.typeId);
    checkWall(model, p.wallId, p.side);
    if (p.place !== 'walls' && p.wallId) fail('invalid-params', 'Stěnu jde zadat jen u place = walls');
    const zones = [{ typeId: p.typeId, top: null }];
    return {
      model: setCoverings(model, p.roomId, (c) => {
        if (p.place === 'floor') return { ...c, floor: p.typeId };
        if (p.place === 'ceiling') return { ...c, ceiling: p.typeId };
        return p.wallId
          ? withOverride(c, faceKey(p.wallId, p.side as FaceSide), zones)
          : { ...c, wallZones: zones };
      }),
    };
  },
});
