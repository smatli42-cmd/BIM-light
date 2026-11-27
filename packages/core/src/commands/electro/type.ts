// Příkazy elektro typů (koncepce 3: knihovna + vlastní značky, i přes AI): nový typ, kopie, úprava
// (změna typu se projeví u všech instancí), smazání nepoužitého typu.
import { GLYPHS } from '../../electro/glyphs.ts';
import {
  BOARD_KINDS,
  ELECTRO_FAMILIES,
  ELECTRO_MOUNTS,
  type ElectroSymbol,
  type ElectroType,
  type SymbolShape,
} from '../../electro/types.ts';
import type { Id } from '../../ids/index.ts';
import type { Model } from '../../model/types.ts';
import { S, type JsonSchema } from '../schema.ts';
import { defineCommand, fail } from '../types.ts';
import { BOARD, electroTypeOf, GROUP, LAYOUT } from './shared.ts';

const SHAPE: JsonSchema = {
  type: 'object',
  description:
    'tvar v jednotkách značky (1 = velikost na papíře), osa y od líce do místnosti: line (points, closed), ' +
    'circle / disc (center, r), arc (center, r, from, to ve °), fill (points), text (at, text, size)',
  required: ['kind'],
  additionalProperties: false,
  properties: {
    kind: S.enumOf(['line', 'circle', 'arc', 'fill', 'disc', 'text'], 'druh tvaru'),
    points: { type: 'array', items: S.point },
    closed: { type: 'boolean' },
    center: S.point,
    r: { type: 'number', exclusiveMinimum: 0 },
    from: { type: 'number' },
    to: { type: 'number' },
    at: S.point,
    text: { type: 'string' },
    size: { type: 'number', exclusiveMinimum: 0 },
  },
};

const SYMBOL_SCHEMA: JsonSchema = {
  description: 'půdorysná značka typu',
  oneOf: [
    S.object(
      {
        kind: S.enumOf(['glyphs'], 'sloty ze znaků knihovny'),
        glyphs: { type: 'array', minItems: 1, items: S.enumOf(Object.keys(GLYPHS), 'znak') },
      },
      ['kind', 'glyphs'],
    ),
    S.object(
      { kind: S.enumOf(['shapes'], 'vlastní značka'), shapes: { type: 'array', minItems: 1, items: SHAPE } },
      ['kind', 'shapes'],
    ),
    S.object({ kind: S.enumOf(['linear'], 'liniové svítidlo'), lines: { type: 'integer', enum: [1, 2] } }, [
      'kind',
      'lines',
    ]),
    S.object({ kind: S.enumOf(['board'], 'rozvaděč'), board: S.enumOf(BOARD_KINDS, 'druh rozvaděče') }, [
      'kind',
      'board',
    ]),
  ],
};

const TYPE_PROPS: Record<string, JsonSchema> = {
  name: { type: 'string', description: 'název typu' },
  description: { type: 'string', description: 'popis do legendy' },
  family: S.enumOf(
    ELECTRO_FAMILIES,
    'druh: device = přístroj, equipment = zařízení, light = svítidlo, board = rozvaděč',
  ),
  groupId: {
    type: 'string',
    description: 'skupina legendy (eg-power, eg-lighting, eg-data, eg-av, eg-security, eg-control)',
  },
  ifcClass: { type: 'string', description: 'třída IFC (IfcOutlet, IfcSwitchingDevice, IfcLightFixture…)' },
  predefinedType: { type: 'string', description: 'IFC PredefinedType (POWEROUTLET, TOGGLESWITCH…)' },
  mount: S.enumOf(ELECTRO_MOUNTS, 'výchozí osazení: wall = na líc stěny, ceiling = na strop'),
  defaultHeight: {
    oneOf: [{ type: 'number' }, { type: 'null' }],
    description: 'výchozí výška osy (mm); null = na stropě',
  },
  symbol: SYMBOL_SCHEMA,
  layout: LAYOUT,
  board: BOARD,
  length: S.number('výchozí délka liniového svítidla (mm)', { exclusiveMinimum: 0 }),
};

type TypeProps = Partial<Omit<ElectroType, 'id' | 'source'>>;

function checkType(m: Model, t: ElectroType) {
  if (!t.name.trim()) fail('invalid', 'Typ potřebuje název');
  if (!m.electroGroups[t.groupId]) fail('not-found', `Skupina legendy ${t.groupId} neexistuje`);
  if (t.symbol.kind === 'board' && !t.board) fail('invalid', 'Rozvaděč potřebuje rozměry (board)');
  if (t.symbol.kind === 'shapes') t.symbol.shapes.forEach(checkShape);
}

function checkShape(s: SymbolShape) {
  const need: Record<SymbolShape['kind'], string[]> = {
    line: ['points'],
    fill: ['points'],
    circle: ['center', 'r'],
    disc: ['center', 'r'],
    arc: ['center', 'r', 'from', 'to'],
    text: ['at', 'text', 'size'],
  };
  const missing = need[s.kind].filter((k) => !(k in s));
  if (missing.length) fail('invalid', `Tvar ${s.kind}: chybí ${missing.join(', ')}`);
}

const putType = (m: Model, t: ElectroType): Model => ({
  ...m,
  electroTypes: { ...m.electroTypes, [t.id]: t },
});

export const electroTypeCreate = defineCommand<
  TypeProps & { name: string; groupId: string; symbol: ElectroSymbol }
>({
  name: 'electroType.create',
  label: 'Nový elektro typ',
  description:
    'Vytvoří vlastní typ elektro značky: název, skupina legendy, druh, třída IFC, výchozí výška (null = strop) ' +
    'a značka – sloty ze znaků knihovny (glyphs), vlastní tvary (shapes, jednotky velikosti značky), liniové ' +
    'svítidlo (linear) nebo rozvaděč (board + rozměry).',
  group: GROUP,
  params: S.object(TYPE_PROPS, ['name', 'groupId', 'symbol']),
  run(model, p, ctx) {
    const t: ElectroType = {
      description: '',
      family: 'device',
      ifcClass: 'IfcFlowTerminal',
      predefinedType: 'USERDEFINED',
      mount: p.defaultHeight === null ? 'ceiling' : 'wall',
      defaultHeight: 300,
      ...p,
      id: ctx.newId(),
    };
    checkType(model, t);
    return { model: putType(model, t), created: [t.id] };
  },
});

export const electroTypeDuplicate = defineCommand<{ typeId: Id; name: string }>({
  name: 'electroType.duplicate',
  label: 'Kopie elektro typu',
  description: 'Zkopíruje elektro typ pod novým názvem (vlastní typ projektu, bez odkazu na knihovnu).',
  group: GROUP,
  params: S.object({ typeId: S.id, name: { type: 'string' } }, ['typeId', 'name']),
  run(model, p, ctx) {
    const { source: _source, ...rest } = electroTypeOf(model, p.typeId);
    const t: ElectroType = { ...rest, id: ctx.newId(), name: p.name };
    checkType(model, t);
    return { model: putType(model, t), created: [t.id] };
  },
});

export const electroTypeUpdate = defineCommand<TypeProps & { typeId: Id }>({
  name: 'electroType.update',
  label: 'Upravit elektro typ',
  description:
    'Změní vlastnosti elektro typu (název, popis, skupinu, třídu IFC, výchozí výšku, značku, rozměry). ' +
    'Změna platí pro všechny prvky tohoto typu (popisek výšky se přepočítá vůči nové výchozí výšce).',
  group: GROUP,
  params: S.object({ typeId: S.id, ...TYPE_PROPS }, ['typeId']),
  run(model, p) {
    const { typeId, ...props } = p;
    const t: ElectroType = { ...electroTypeOf(model, typeId), ...props };
    checkType(model, t);
    const els = Object.values(model.electroElements)
      .filter((e) => e.typeId === t.id)
      .map((e) => {
        const { slots: _slots, ...rest } = e;
        return { ...(t.symbol.kind === 'glyphs' ? e : rest), ifcClass: t.ifcClass };
      });
    const electroElements = { ...model.electroElements, ...Object.fromEntries(els.map((e) => [e.id, e])) };
    return { model: { ...putType(model, t), electroElements } };
  },
});

export const electroTypeDelete = defineCommand<{ typeId: Id }>({
  name: 'electroType.delete',
  label: 'Smazat elektro typ',
  description: 'Smaže elektro typ; typ použitý některým prvkem se odmítne.',
  group: GROUP,
  params: S.object({ typeId: S.id }, ['typeId']),
  run(model, p) {
    const t = electroTypeOf(model, p.typeId);
    const used = Object.values(model.electroElements).filter((e) => e.typeId === t.id).length;
    if (used) fail('invalid', `Typ „${t.name}“ používá ${used} prvků`);
    const { [t.id]: _gone, ...electroTypes } = model.electroTypes;
    return { model: { ...model, electroTypes } };
  },
});
