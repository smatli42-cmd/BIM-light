// Příkazy projektu: podlaží a poloha ve světě (základy 1, 12, 17).
// Změna výšky podlaží: prvky s vázanou výškou se přizpůsobí samy (výška se počítá, neukládá).
import type { Id } from '../../ids/index.ts';
import type { Georeference, Storey } from '../../model/types.ts';
import { putStorey } from '../../model/update.ts';
import { storeyOf } from '../lookup.ts';
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
  description: 'Přidá podlaží: název, výška úrovně nad ±0,000 a konstrukční výška (mm).',
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
    return { model: putStorey(model, storey), created: [storey.id] };
  },
});

export const storeyUpdate = defineCommand<{
  storeyId: Id;
  name?: string;
  elevation?: number;
  height?: number;
}>({
  name: 'storey.update',
  label: 'Upravit podlaží',
  description: 'Změní název, úroveň nebo výšku podlaží. Vázané výšky prvků se přepočítají samy.',
  group: 'Projekt',
  params: S.object(
    {
      storeyId: S.id,
      name: { type: 'string' },
      elevation: S.number('mm'),
      height: S.number('mm', { exclusiveMinimum: 0 }),
    },
    ['storeyId'],
  ),
  run(model, p) {
    const s = storeyOf(model, p.storeyId);
    const next = {
      ...s,
      name: p.name ?? s.name,
      elevation: p.elevation ?? s.elevation,
      height: p.height ?? s.height,
    };
    return { model: putStorey(model, next) };
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
