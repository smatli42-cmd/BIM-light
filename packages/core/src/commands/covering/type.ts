// Příkazy typů úprav povrchů (prvky stavby 9, IfcCovering): nový, úprava, kopie, smazání. Formát,
// spára a zarovnání se zatím jen ukládají (spárořez je další krok).
import {
  COVERING_KINDS,
  TILE_ALIGNS,
  TILED_KINDS,
  type CoveringKind,
  type CoveringType,
  type CoveringZone,
  type TileFormat,
} from '../../covering/types.ts';
import type { Id } from '../../ids/index.ts';
import type { Model } from '../../model/types.ts';
import { putRooms } from '../../model/update.ts';
import type { Room } from '../../room/types.ts';
import { S, type JsonSchema } from '../schema.ts';
import { defineCommand, fail } from '../types.ts';

const GROUP = 'Povrchy';
const KIND = S.enumOf(
  COVERING_KINDS,
  'druh: paint = malba, plaster = omítka, tiling = obklad, floor-tiles = dlažba, flooring = podlahovina, ' +
    'ceiling = podhled, skirting = sokl',
);
const TILE: JsonSchema = S.object(
  {
    width: S.number('šířka dlaždice (mm)', { minimum: 1 }),
    height: S.number('výška dlaždice (mm)', { minimum: 1 }),
    joint: S.number('spára (mm)', { minimum: 0 }),
    jointColor: { type: 'string', description: 'barva spáry #rrggbb' },
    align: S.enumOf(TILE_ALIGNS, 'zarovnání: corner = od rohu, center = na střed, axis = na osu spáry'),
  },
  [],
);
const PROPS = {
  name: { type: 'string', description: 'název typu' },
  kind: KIND,
  materialId: { oneOf: [S.id, { type: 'null' }], description: 'materiál projektu (barva ve 3D)' },
  tile: TILE,
} as const satisfies Record<string, JsonSchema>;

interface Editable {
  name?: string;
  kind?: CoveringKind;
  materialId?: Id | null;
  tile?: Partial<TileFormat>;
}

const DEFAULT_TILE: TileFormat = {
  width: 300,
  height: 300,
  joint: 3,
  jointColor: '#a0a0a0',
  align: 'corner',
};

export const coveringTypeOf = (m: Model, id: Id): CoveringType =>
  m.coveringTypes[id] ?? fail('not-found', `Typ úpravy ${id} neexistuje`);

function build(m: Model, base: CoveringType, p: Editable): Model {
  if (p.materialId && !m.materials[p.materialId]) fail('not-found', `Materiál ${p.materialId} neexistuje`);
  const name = p.name?.trim() ?? base.name;
  if (!name) fail('invalid', 'Název typu nesmí být prázdný');
  const kind = p.kind ?? base.kind;
  const tiled = TILED_KINDS.includes(kind);
  const tile = tiled ? { ...DEFAULT_TILE, ...base.tile, ...p.tile } : undefined;
  if (tile && !/^#[0-9a-fA-F]{6}$/.test(tile.jointColor)) fail('invalid', 'Barva spáry musí být #rrggbb');
  const { tile: _old, ...rest } = base;
  const next: CoveringType = {
    ...rest,
    name,
    kind,
    materialId: p.materialId === undefined ? base.materialId : p.materialId,
    ...(tile && { tile }),
  };
  return { ...m, coveringTypes: { ...m.coveringTypes, [next.id]: next } };
}

export const coveringTypeCreate = defineCommand<Editable & { name: string; kind: CoveringKind }>({
  name: 'coveringType.create',
  label: 'Nový typ úpravy povrchu',
  description:
    'Vytvoří typ úpravy povrchu (IfcCovering): název, druh, materiál projektu, u obkladu, dlažby a soklu ' +
    'formát dlaždice, spáru, barvu spáry a zarovnání. Vrací id typu.',
  group: GROUP,
  params: S.object(PROPS, ['name', 'kind']),
  run(model, p, ctx) {
    const base: CoveringType = { id: ctx.newId(), name: p.name, kind: p.kind, materialId: null };
    return { model: build(model, base, p), created: [base.id] };
  },
});

export const coveringTypeUpdate = defineCommand<Editable & { typeId: Id }>({
  name: 'coveringType.update',
  label: 'Upravit typ úpravy povrchu',
  description: 'Změní název, druh, materiál nebo formát typu úpravy; plochy všech místností se přepočítají.',
  group: GROUP,
  params: S.object({ typeId: S.id, ...PROPS }, ['typeId']),
  run: (model, p) => ({ model: build(model, coveringTypeOf(model, p.typeId), p) }),
});

export const coveringTypeDuplicate = defineCommand<{ typeId: Id; name?: string }>({
  name: 'coveringType.duplicate',
  label: 'Kopie typu úpravy povrchu',
  description: 'Zkopíruje typ úpravy (bez odkazu na knihovnu) pod novým názvem; vrací id kopie.',
  group: GROUP,
  params: S.object({ typeId: S.id, name: { type: 'string', description: 'název kopie' } }, ['typeId']),
  run(model, p, ctx) {
    const { source: _s, ...t } = coveringTypeOf(model, p.typeId);
    const copy = { ...t, id: ctx.newId(), name: p.name?.trim() || `${t.name} (kopie)` };
    return {
      model: { ...model, coveringTypes: { ...model.coveringTypes, [copy.id]: copy } },
      created: [copy.id],
    };
  },
});

/** Místnost bez odkazů na smazaný typ (zóny a podlaha / strop dostanou null). */
function withoutType(r: Room, id: Id): Room {
  const c = r.coverings;
  if (!c) return r;
  const zones = (zs: readonly CoveringZone[]) =>
    zs.map((z) => (z.typeId === id ? { ...z, typeId: null } : z));
  return {
    ...r,
    coverings: {
      ...c,
      ...(c.wallZones && { wallZones: zones(c.wallZones) }),
      ...(c.wallOverrides && {
        wallOverrides: Object.fromEntries(Object.entries(c.wallOverrides).map(([k, v]) => [k, zones(v)])),
      }),
      ...(c.floor === id && { floor: null }),
      ...(c.ceiling === id && { ceiling: null }),
    },
  };
}

export const coveringTypeDelete = defineCommand<{ typeId: Id }>({
  name: 'coveringType.delete',
  label: 'Smazat typ úpravy povrchu',
  description: 'Smaže typ úpravy; plochy, které ho měly, zůstanou bez úpravy (zóny zůstanou).',
  group: GROUP,
  params: S.object({ typeId: S.id }, ['typeId']),
  run(model, p) {
    coveringTypeOf(model, p.typeId);
    const { [p.typeId]: _gone, ...rest } = model.coveringTypes;
    const rooms = Object.values(model.rooms).map((r) => withoutType(r, p.typeId));
    return { model: putRooms({ ...model, coveringTypes: rest }, rooms) };
  },
});
