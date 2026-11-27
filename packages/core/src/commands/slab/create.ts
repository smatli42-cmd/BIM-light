// Příkaz: nová deska (D1). Obrys = mnohoúhelník (`outline`) nebo obdélník ze dvou rohů (`rect`).
// Horní líc: podlaha na úrovni podlaží (čistá podlaha), nosná deska pod skladbou podlahy.
import type { Vec2 } from '../../geometry/index.ts';
import type { Model } from '../../model/types.ts';
import { findWall } from '../../wall/queries.ts';
import { linkedShape, type SlabShape } from '../../slab/link.ts';
import { IFC_CLASS } from '../../model/categories.ts';
import { STATUSES, type Status } from '../../model/types.ts';
import { putElements } from '../../model/update.ts';
import { WALL_BOUNDARIES, type WallBoundary } from '../../slab/from-walls.ts';
import {
  defaultTopOffset,
  SLAB_FUNCTIONS,
  type Slab,
  type SlabFunction,
  type SlabLink,
} from '../../slab/types.ts';
import { storeyOf } from '../lookup.ts';
import { S } from '../schema.ts';
import { defineCommand, fail } from '../types.ts';
import { OUTLINE_SCHEMA, RECT_SCHEMA, rectOutline, slabTypeOf, validOutline } from './shared.ts';

export interface SlabCreateParams {
  storeyId: string;
  typeId: string;
  outline?: Vec2[];
  rect?: { a: Vec2; b: Vec2 };
  /** Obrys ze stěn (D2): stěny tvoří uzavřenou smyčku; boundary = líc nebo líc jádra. */
  walls?: { wallIds: string[]; boundary?: WallBoundary };
  /** Podlaha podle místnosti: obrys = obrys místnosti, přepočítává se s ní (vazba). */
  roomId?: string;
  topOffset?: number;
  slabFunction?: SlabFunction;
  status?: Status;
  discipline?: string;
}

/** IFC třída podle funkce: nosná deska = IfcSlab, skladba podlahy = IfcCovering (FLOORING). */
export const slabIfcClass = (f: SlabFunction): string =>
  f === 'floor' ? IFC_CLASS.covering : IFC_CLASS.slab;

/** Vazba nové desky: stěny smyčky, nebo místnost (jen podlaha). */
function createLink(model: Model, p: SlabCreateParams, fn: SlabFunction): SlabLink | undefined {
  if (p.outline || p.rect) return undefined;
  if (p.roomId) {
    const room = model.rooms[p.roomId];
    if (!room) return fail('not-found', `Místnost ${p.roomId} neexistuje`);
    if (room.storeyId !== p.storeyId) fail('invalid', 'Místnost musí být ve stejném podlaží jako deska');
    if (fn !== 'floor') fail('invalid', 'Na místnost jde navázat jen podlaha (slabFunction floor)');
    return { kind: 'room', roomId: p.roomId };
  }
  if (!p.walls) return fail('invalid-params', 'Chybí outline, rect, walls nebo roomId');
  checkWalls(model, p.walls.wallIds, p.storeyId);
  return { kind: 'walls', wallIds: [...p.walls.wallIds], boundary: p.walls.boundary ?? 'face' };
}

/** Stěny vazby musí existovat a být v podlaží desky. */
export function checkWalls(model: Model, wallIds: readonly string[], storeyId: string) {
  for (const id of wallIds) {
    const w = findWall(model, id);
    if (!w) fail('not-found', `Stěna ${id} neexistuje`);
    else if (w.storeyId !== storeyId) fail('invalid', 'Stěny obrysu musí být ve stejném podlaží jako deska');
  }
}

/** Obrys z vazby, nebo odmítnutí s důvodem. */
export function linkShapeOrFail(model: Model, link: SlabLink): SlabShape {
  const sh = linkedShape(model, link);
  if (sh) return sh;
  return fail(
    'invalid',
    link.kind === 'room'
      ? 'Místnost nemá uzavřený obrys (deska podle ní nejde vytvořit)'
      : 'Ze stěn nejde sestavit uzavřený obrys',
  );
}

export const slabCreate = defineCommand<SlabCreateParams>({
  name: 'slab.create',
  label: 'Deska',
  description:
    'Vytvoří desku (strop nebo skladbu podlahy) s obrysem outline (body mnohoúhelníku), rect ' +
    '(dva protilehlé rohy) nebo walls (stěny uzavřené smyčky; boundary face = vnitřní líc, core = ' +
    'vnitřní líc nosného jádra) nebo roomId (podlaha podle místnosti: obrys od líce k líci i s ostrovy). ' +
    'Deska podle stěn i podle místnosti si vazbu pamatuje a obrys se po změně stěn přepočítá. topOffset = horní líc nad úrovní podlaží v mm (výchozí: podlaha 0, nosná ' +
    'deska −150, tj. pod skladbou podlahy); tloušťka jde dolů podle skladby typu. slabFunction výchozí ' +
    'podle typu (structure = nosná deska, floor = skladba podlahy).',
  group: 'Deska',
  icon: 'slab',
  shortcut: 'S',
  params: S.object(
    {
      storeyId: S.id,
      typeId: S.id,
      outline: OUTLINE_SCHEMA,
      rect: RECT_SCHEMA,
      walls: S.object(
        {
          wallIds: { type: 'array', items: S.id, minItems: 2 },
          boundary: S.enumOf(WALL_BOUNDARIES, 'face = vnitřní líc, core = líc jádra'),
        },
        ['wallIds'],
      ),
      roomId: S.id,
      topOffset: S.number('horní líc nad úrovní podlaží (mm)'),
      slabFunction: S.enumOf(SLAB_FUNCTIONS, 'structure = nosná deska, floor = skladba podlahy'),
      status: S.enumOf(STATUSES, 'stav: stávající / bourání / nový'),
      discipline: { type: 'string' },
    },
    ['storeyId', 'typeId'],
  ),
  run(model, p, ctx) {
    const storey = storeyOf(model, p.storeyId);
    const type = slabTypeOf(model, p.typeId);
    const fn = p.slabFunction ?? (p.roomId ? 'floor' : type.slabFunction);
    const link = createLink(model, p, fn);
    const shape = link ? linkShapeOrFail(model, link) : undefined;
    const pts = p.outline ?? (p.rect ? rectOutline(p.rect.a, p.rect.b) : (shape?.outline ?? []));
    const slab: Slab = {
      id: ctx.newId(),
      ifcClass: slabIfcClass(fn),
      category: 'slab',
      discipline: p.discipline ?? 'architecture',
      status: p.status ?? 'new',
      variant: ctx.variant,
      storeyId: storey.id,
      typeId: type.id,
      slabFunction: fn,
      outline: validOutline(pts),
      ...(shape?.holes.length && { holes: shape.holes }),
      ...(link && { link }),
      topOffset: p.topOffset ?? defaultTopOffset(fn),
    };
    return { model: putElements(model, [slab]), created: [slab.id] };
  },
});
