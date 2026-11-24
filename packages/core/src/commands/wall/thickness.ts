// Příkazy: tloušťka stěny (katalog kreslení, část 6) a referenční čára (část 6.3).
import { offsetPath } from '../../geometry/index.ts';
import type { Id } from '../../ids/index.ts';
import type { Model } from '../../model/types.ts';
import { putElements, putWallType } from '../../model/update.ts';
import { bandAt, bandThickness, crossSection, DEFAULT_CUT_HEIGHT } from '../../wall/layers.ts';
import type { HeightBand, ReferenceLine, WallType } from '../../wall/types.ts';
import { wallOf, wallTypeOf } from '../lookup.ts';
import { S } from '../schema.ts';
import { defineCommand, fail } from '../types.ts';

/** Pás se změněným jádrem (povrchové vrstvy zůstávají, rozhodnutí 5). */
function withCoreDelta(band: HeightBand, delta: number): HeightBand {
  let idx = band.layers.findIndex((l) => l.function === 'core');
  if (idx < 0) idx = 0;
  return {
    ...band,
    layers: band.layers.map((l, i) => (i === idx ? { ...l, thickness: l.thickness + delta } : l)),
  };
}

const sameBands = (a: readonly HeightBand[], b: readonly HeightBand[]) =>
  JSON.stringify(a) === JSON.stringify(b);

/** Existující typ se stejnou skladbou, nebo nový (rozhodnutí: slučování podle tloušťky). */
function typeForThickness(model: Model, type: WallType, thickness: number, newId: () => Id) {
  const delta = thickness - bandThickness(bandAt(type, DEFAULT_CUT_HEIGHT));
  const bands = type.bands.map((b) => withCoreDelta(b, delta));
  if (bands.some((b) => b.layers.some((l) => l.thickness <= 0)))
    fail('invalid', 'Jádro by mělo nulovou tloušťku');
  const existing = Object.values(model.wallTypes).find((t) => sameBands(t.bands, bands));
  if (existing) return { type: existing, isNew: false };
  const base = type.name.replace(/\s+\d+(\s*mm)?$/, '');
  return { type: { id: newId(), name: `${base} ${thickness}`, bands } as WallType, isNew: true };
}

export const wallSetThickness = defineCommand<{ wallId: Id; thickness: number }>({
  name: 'wall.setThickness',
  label: 'Tloušťka stěny',
  description:
    'Změní tloušťku jedné stěny: přiřadí existující typ se stejnou skladbou, nebo vytvoří nový. ' +
    'Mění se jádro; referenční čára zůstane na místě.',
  group: 'Stěna',
  params: S.object({ wallId: S.id, thickness: S.number('mm', { exclusiveMinimum: 0 }) }, [
    'wallId',
    'thickness',
  ]),
  run(model, p, ctx) {
    const w = wallOf(model, p.wallId);
    const { type, isNew } = typeForThickness(model, wallTypeOf(model, w.typeId), p.thickness, ctx.newId);
    let m = isNew ? putWallType(model, type) : model;
    m = putElements(m, [{ ...w, typeId: type.id }]);
    return { model: m, created: isNew ? [type.id] : [] };
  },
});

export const wallSetReferenceLine = defineCommand<{ wallId: Id; referenceLine: ReferenceLine }>({
  name: 'wall.setReferenceLine',
  label: 'Referenční čára',
  description:
    'Přepne referenční čáru (líc / osa / líc jádra). Stěna zůstane na místě, změní se jen vztažná čára.',
  group: 'Stěna',
  params: S.object(
    { wallId: S.id, referenceLine: S.enumOf(['face', 'axis', 'core-face'], 'referenční čára') },
    ['wallId', 'referenceLine'],
  ),
  run(model, p) {
    const w = wallOf(model, p.wallId);
    const band = bandAt(wallTypeOf(model, w.typeId), DEFAULT_CUT_HEIGHT);
    const before = crossSection(w, band).faces.ref;
    const after = crossSection({ ...w, referenceLine: p.referenceLine }, band).faces.ref;
    const path = offsetPath(w.path, before - after);
    return { model: putElements(model, [{ ...w, referenceLine: p.referenceLine, path }]) };
  },
});
