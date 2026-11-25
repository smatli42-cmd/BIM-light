// Příkazy projektu: nové podlaží a poloha ve světě (základy 1, 12, 17).
// Úprava a smazání podlaží jsou v storey-edit.ts.
import type { Id } from '../../ids/index.ts';
import type { Georeference, Storey } from '../../model/types.ts';
import { putStorey, putView } from '../../model/update.ts';
import type { View } from '../../view/types.ts';
import { DEFAULT_CUT_HEIGHT } from '../../wall/layers.ts';
import { S } from '../schema.ts';
import { defineCommand, fail } from '../types.ts';

export const storeyCreate = defineCommand<{
  name: string;
  elevation: number;
  height: number;
  buildingId?: Id;
}>({
  name: 'storey.create',
  label: 'Nové podlaží',
  description:
    'Přidá podlaží: název, výška úrovně nad ±0,000 a konstrukční výška (mm). Vznikne i jeho pracovní ' +
    'okno (styl a měřítko jako první okno projektu).',
  group: 'Projekt',
  params: S.object(
    {
      name: { type: 'string' },
      elevation: S.number('mm nad ±0,000'),
      height: S.number('mm', { exclusiveMinimum: 0 }),
      buildingId: S.id,
    },
    ['name', 'elevation', 'height'],
  ),
  run(model, p, ctx) {
    const buildingId =
      p.buildingId ?? Object.keys(model.buildings)[0] ?? fail('invalid', 'Projekt nemá budovu');
    if (!model.buildings[buildingId]) fail('not-found', 'Budova neexistuje');
    const storey: Storey = {
      id: ctx.newId(),
      name: p.name,
      buildingId,
      elevation: p.elevation,
      height: p.height,
    };
    // Pracovní okno nového podlaží (koncepce rozhraní, část 4) se stylem prvního okna projektu.
    const base = Object.values(model.views).find((v) => !v.saved) ?? Object.values(model.views)[0];
    const styleId = base?.styleId ?? Object.keys(model.display.styles)[0] ?? '';
    const view: View = {
      id: ctx.newId(),
      name: `${storey.name} – ${model.display.styles[styleId]?.name ?? ''}`,
      storeyId: storey.id,
      crop: null,
      scale: base?.scale ?? 100,
      styleId,
      local: {},
      activeAnnotationLayerId: null,
      cutPlane: DEFAULT_CUT_HEIGHT,
      elementOverrides: {},
      saved: false,
    };
    return { model: putView(putStorey(model, storey), view), created: [storey.id, view.id] };
  },
});

export const projectSetGeoreference = defineCommand<Georeference>({
  name: 'project.setGeoreference',
  label: 'Poloha projektu',
  description:
    'Nastaví počátek projektu v S-JTSK (Y, X v m), natočení k severu (°) a výšku ±0,000 v Bpv (m).',
  group: 'Projekt',
  params: S.object(
    {
      sjtskY: S.number('m'),
      sjtskX: S.number('m'),
      rotationDeg: S.number('stupně'),
      elevationBpv: S.number('m'),
    },
    ['sjtskY', 'sjtskX', 'rotationDeg', 'elevationBpv'],
  ),
  run: (model, p) => ({ model: { ...model, project: { ...model.project, georef: { ...p } } } }),
});
