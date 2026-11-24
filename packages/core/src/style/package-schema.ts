// JSON schéma balíčku zobrazení (základ 31): podle něj se kontroluje import a může ho číst AI.
import { S, type JsonSchema } from '../commands/schema.ts';

const str: JsonSchema = { type: 'string' };
const num: JsonSchema = { type: 'number' };

const effect: JsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    visible: { type: 'boolean' },
    cutPen: { type: 'integer', minimum: 1 },
    projectionPen: { type: 'integer', minimum: 1 },
    layerPen: { type: 'integer', minimum: 1 },
    lineColor: str,
    lineType: S.enumOf(['solid', 'dashed', 'dotted', 'dash-dot'], 'typ čáry'),
    fillColor: { oneOf: [str, { type: 'null' }] },
    hatch: {
      oneOf: [
        S.enumOf(['material', 'none'], 'šrafa'),
        S.object(
          {
            hatchId: str,
            pen: { type: 'integer', minimum: 1 },
            lineColor: { oneOf: [str, { type: 'null' }] },
            fillColor: { oneOf: [str, { type: 'null' }] },
          },
          ['hatchId', 'pen', 'lineColor'],
        ),
      ],
    },
    transparency: { type: 'number', minimum: 0, maximum: 100 },
  },
};

export const LAYER_SCHEMA = S.object(
  {
    id: str,
    name: str,
    kind: S.enumOf(['category', 'annotation'], 'druh'),
    categories: { type: 'array', items: str },
  },
  ['id', 'name', 'kind', 'categories'],
);
export const LAYER_COMBINATION_SCHEMA = S.object({ id: str, name: str, states: { type: 'object' } }, [
  'id',
  'name',
  'states',
]);
export const RULE_SCHEMA = S.object(
  {
    id: str,
    name: str,
    conditions: {
      type: 'array',
      items: S.object({ property: str, op: S.enumOf(['eq', 'neq', 'in'], 'op'), value: {} }, [
        'property',
        'op',
        'value',
      ]),
    },
    effect,
    disabled: { type: 'boolean' },
  },
  ['id', 'name', 'conditions', 'effect'],
);
export const OVERRIDE_COMBINATION_SCHEMA = S.object(
  { id: str, name: str, ruleIds: { type: 'array', items: str } },
  ['id', 'name', 'ruleIds'],
);
export const STYLE_SCHEMA: JsonSchema = {
  type: 'object',
  required: [
    'id',
    'name',
    'layerCombinationId',
    'detail',
    'overrideCombinationId',
    'defaultScale',
    'hatchScale',
    'defaultAnnotationLayerId',
  ],
  properties: {
    id: str,
    name: str,
    layerCombinationId: str,
    detail: S.enumOf(['coarse', 'medium', 'fine'], 'podrobnost'),
    overrideCombinationId: str,
    categoryGraphics: { type: 'object' },
    labels: { type: 'object' },
    defaultScale: { type: 'number', exclusiveMinimum: 0 },
    hatchScale: { type: 'number', minimum: 0.5, maximum: 3, description: 'měřítko šraf' },
    defaultAnnotationLayerId: str,
  },
};

/** Kontrola horní úrovně; položky kolekcí se kontrolují zvlášť (viz package.ts). */
export const DISPLAY_SETTINGS_SCHEMA: JsonSchema = {
  type: 'object',
  required: [
    'schemaVersion',
    'layers',
    'layerCombinations',
    'rules',
    'overrideCombinations',
    'styles',
    'penTable',
    'baseGraphics',
    'categoryGraphics',
    'paperSizes',
    'hatches',
  ],
  properties: {
    schemaVersion: { type: 'integer', minimum: 1 },
    layers: { type: 'object' },
    layerCombinations: { type: 'object' },
    rules: { type: 'object' },
    overrideCombinations: { type: 'object' },
    styles: { type: 'object' },
    hatches: { type: 'object' },
    penTable: S.object(
      {
        scales: { type: 'array', items: { type: 'number', exclusiveMinimum: 0 }, minItems: 1 },
        pens: {
          type: 'array',
          minItems: 1,
          items: S.object(
            {
              pen: { type: 'integer', minimum: 1 },
              widths: { type: 'array', items: { type: 'number', exclusiveMinimum: 0 } },
            },
            ['pen', 'widths'],
          ),
        },
      },
      ['scales', 'pens'],
    ),
    baseGraphics: effect,
    categoryGraphics: { type: 'object' },
    paperSizes: {
      type: 'object',
      required: [
        'dimensionText',
        'labelText',
        'dimensionTick',
        'dimensionTextGap',
        'extensionGap',
        'extensionOvershoot',
      ],
      properties: Object.fromEntries(
        [
          'dimensionText',
          'labelText',
          'dimensionTick',
          'dimensionTextGap',
          'extensionGap',
          'extensionOvershoot',
        ].map((k) => [k, num]),
      ),
    },
  },
};

export const EFFECT_SCHEMA = effect;
