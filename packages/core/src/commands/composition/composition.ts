// Příkazy skladeb (krok 3 editoru typů, koncepce rozhraní 11a): přejmenovat, „Použít pro“ (stěna,
// deska, střecha), přiřadit skladbu pásu typu stěny, smazat nepoužitou. Vrstvy skladby se mění příkazy
// wallType.* (addLayer, updateLayer…) – změna platí pro všechny typy, které skladbu sdílejí.
import { compositionUsers } from '../../composition/store.ts';
import { slabTypeUsers } from '../../slab/queries.ts';
import type { Composition } from '../../composition/types.ts';
import type { Id } from '../../ids/index.ts';
import type { Model } from '../../model/types.ts';
import { wallTypeOf } from '../lookup.ts';
import { S } from '../schema.ts';
import { defineCommand, fail } from '../types.ts';
import { bandOf, BAND_INDEX, putValidType } from '../wall-type/shared.ts';

const GROUP = 'Skladba';

export const compositionOf = (m: Model, id: Id): Composition =>
  m.compositions[id] ?? fail('not-found', `Skladba ${id} neexistuje`);

const put = (m: Model, c: Composition): Model => ({ ...m, compositions: { ...m.compositions, [c.id]: c } });

export const compositionRename = defineCommand<{ compositionId: Id; name: string }>({
  name: 'composition.rename',
  label: 'Přejmenovat skladbu',
  description:
    'Přejmenuje skladbu (společnou pro stěny, desky a střechy). Typy, které ji používají, se nemění.',
  group: GROUP,
  params: S.object({ compositionId: S.id, name: { type: 'string', description: 'nový název' } }, [
    'compositionId',
    'name',
  ]),
  run(model, p) {
    const name = p.name.trim();
    if (!name) fail('invalid', 'Název skladby nesmí být prázdný');
    return { model: put(model, { ...compositionOf(model, p.compositionId), name }) };
  },
});

export const compositionSetUse = defineCommand<{
  compositionId: Id;
  wall?: boolean;
  slab?: boolean;
  roof?: boolean;
}>({
  name: 'composition.setUse',
  label: 'Použít skladbu pro',
  description:
    'Nastaví, pro které prvky se skladba nabízí: stěna, deska, střecha (zadané hodnoty; jako „Použít pro“ ' +
    'v Arditu). Skladba, kterou typ stěny už používá, musí zůstat pro stěnu.',
  group: GROUP,
  params: S.object(
    {
      compositionId: S.id,
      wall: { type: 'boolean', description: 'stěna' },
      slab: { type: 'boolean', description: 'deska' },
      roof: { type: 'boolean', description: 'střecha' },
    },
    ['compositionId'],
  ),
  run(model, { compositionId, ...use }) {
    const c = compositionOf(model, compositionId);
    const next = { ...c.use, ...use };
    if (!next.wall && compositionUsers(model, c.id).length)
      fail('invalid', `Skladbu „${c.name}“ používá typ stěny – pro stěnu musí zůstat`);
    if (!next.slab && slabTypeUsers(model, c.id).length)
      fail('invalid', `Skladbu „${c.name}“ používá typ desky – pro desku musí zůstat`);
    return { model: put(model, { ...c, use: next }) };
  },
});

export const wallTypeSetComposition = defineCommand<{ typeId: Id; compositionId: Id; bandIndex?: number }>({
  name: 'wallType.setComposition',
  label: 'Skladba typu stěny',
  description:
    'Přiřadí pásu typu stěny (bandIndex, výchozí 0) existující skladbu: typ převezme její vrstvy a od teď ' +
    'ji sdílí s ostatními typy (úprava vrstev platí pro všechny). Skladba musí být „pro stěnu“.',
  group: 'Typ stěny',
  params: S.object({ typeId: S.id, compositionId: S.id, bandIndex: BAND_INDEX }, ['typeId', 'compositionId']),
  run(model, p) {
    const t = wallTypeOf(model, p.typeId);
    const c = compositionOf(model, p.compositionId);
    if (!c.use.wall) fail('invalid', `Skladba „${c.name}“ není určená pro stěnu`);
    const bi = p.bandIndex ?? 0;
    bandOf(t, bi);
    const bands = t.bands.map((b, i) => (i === bi ? { ...b, compositionId: c.id, layers: c.layers } : b));
    return { model: putValidType(model, { ...t, bands }) };
  },
});

export const compositionDelete = defineCommand<{ compositionId: Id }>({
  name: 'composition.delete',
  label: 'Smazat skladbu',
  description: 'Smaže skladbu, kterou nepoužívá žádný typ; používanou odmítne a řekne, které typy ji mají.',
  group: GROUP,
  params: S.object({ compositionId: S.id }, ['compositionId']),
  run(model, p) {
    const c = compositionOf(model, p.compositionId);
    const users = [...compositionUsers(model, c.id), ...slabTypeUsers(model, c.id)];
    if (users.length) fail('invalid', `Skladbu „${c.name}“ používá: ${users.map((t) => t.name).join(', ')}`);
    const { [c.id]: _gone, ...compositions } = model.compositions;
    return { model: { ...model, compositions } };
  },
});
