// Příkazy kategorií místností (Archicad Zone Category) a obsahu razítka místnosti ve stylu (základy 27, 31).
import type { Id } from '../../ids/index.ts';
import { putRooms, setDisplay } from '../../model/update.ts';
import { ROOM_AREA_KINDS, type RoomAreaKind, type RoomCategory } from '../../room/category.ts';
import { ROOM_STAMP_FIELDS, type RoomStampField } from '../../room/stamp.ts';
import { styleOf } from '../lookup.ts';
import { S, type JsonSchema } from '../schema.ts';
import { defineCommand, fail } from '../types.ts';

const COLOR: JsonSchema = { type: 'string', description: 'barva výplně #rrggbb' };
const AREA_KIND = S.enumOf(ROOM_AREA_KINDS, 'druh plochy: living = obytná, utility = užitková');

function checkColor(c: string | undefined) {
  if (c !== undefined && !/^#[0-9a-fA-F]{6}$/.test(c)) fail('invalid', 'Barva musí být #rrggbb');
}

export const roomCategoryCreate = defineCommand<{ name: string; color: string; areaKind?: RoomAreaKind }>({
  name: 'roomCategory.create',
  label: 'Nová kategorie místnosti',
  description:
    'Vytvoří kategorii (funkci) místností s barvou výplně v půdorysu a druhem plochy (obytná / užitková ' +
    'podle ČSN 73 4301). Barvu kategorie přebije styl, pravidlo i vlastní barva místnosti.',
  group: 'Místnost',
  params: S.object({ name: { type: 'string' }, color: COLOR, areaKind: AREA_KIND }, ['name', 'color']),
  run(model, p, ctx) {
    checkColor(p.color);
    if (!p.name.trim()) fail('invalid', 'Název kategorie nesmí být prázdný');
    const c: RoomCategory = {
      id: ctx.newId(),
      name: p.name.trim(),
      color: p.color,
      areaKind: p.areaKind ?? 'utility',
    };
    return { model: { ...model, roomCategories: { ...model.roomCategories, [c.id]: c } }, created: [c.id] };
  },
});

export const roomCategoryUpdate = defineCommand<{
  categoryId: Id;
  name?: string;
  color?: string;
  areaKind?: RoomAreaKind;
}>({
  name: 'roomCategory.update',
  label: 'Upravit kategorii místnosti',
  description: 'Změní název, barvu nebo druh plochy kategorie místností; místnosti kategorie se překreslí.',
  group: 'Místnost',
  params: S.object({ categoryId: S.id, name: { type: 'string' }, color: COLOR, areaKind: AREA_KIND }, [
    'categoryId',
  ]),
  run(model, p) {
    const c = model.roomCategories[p.categoryId] ?? fail('not-found', 'Kategorie neexistuje');
    checkColor(p.color);
    const next = {
      ...c,
      ...(p.name?.trim() && { name: p.name.trim() }),
      ...(p.color && { color: p.color }),
      ...(p.areaKind && { areaKind: p.areaKind }),
    };
    return { model: { ...model, roomCategories: { ...model.roomCategories, [c.id]: next } } };
  },
});

export const roomCategoryDelete = defineCommand<{ categoryId: Id }>({
  name: 'roomCategory.delete',
  label: 'Smazat kategorii místnosti',
  description: 'Smaže kategorii místností; místnosti, které ji měly, zůstanou bez kategorie.',
  group: 'Místnost',
  params: S.object({ categoryId: S.id }, ['categoryId']),
  run(model, p) {
    if (!model.roomCategories[p.categoryId]) fail('not-found', 'Kategorie neexistuje');
    const { [p.categoryId]: _gone, ...rest } = model.roomCategories;
    const freed = Object.values(model.rooms)
      .filter((r) => r.categoryId === p.categoryId)
      .map(({ categoryId: _c, ...r }) => r);
    return { model: putRooms({ ...model, roomCategories: rest }, freed) };
  },
});

export const styleSetRoomStamp = defineCommand<{ styleId: Id; fields: RoomStampField[] }>({
  name: 'style.setRoomStamp',
  label: 'Obsah razítka místnosti',
  description:
    'Nastaví, které údaje ukazuje razítko místnosti a v jakém pořadí, pro všechna razítka v pohledech se ' +
    `stylem. fields z: ${ROOM_STAMP_FIELDS.join(', ')}. Výchozí number, name, area.`,
  group: 'Zobrazení',
  params: S.object(
    { styleId: S.id, fields: { type: 'array', items: S.enumOf(ROOM_STAMP_FIELDS, 'údaj razítka') } },
    ['styleId', 'fields'],
  ),
  run(model, p) {
    const style = styleOf(model, p.styleId);
    const d = model.display;
    const fields = [...new Set(p.fields)];
    return {
      model: setDisplay(model, {
        ...d,
        styles: { ...d.styles, [style.id]: { ...style, roomStamp: fields } },
      }),
    };
  },
});
