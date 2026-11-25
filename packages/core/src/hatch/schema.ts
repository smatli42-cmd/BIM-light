// JSON schéma šrafy (základy 31, 34): kontroluje import balíčku zobrazení a popisuje šrafu pro AI.
import { S, type JsonSchema } from '../commands/schema.ts';

const num: JsonSchema = { type: 'number' };
const pos: JsonSchema = { type: 'number', exclusiveMinimum: 0 };

const POINT: JsonSchema = S.object({ x: num, y: num }, ['x', 'y']);
const CURVE: JsonSchema = S.object(
  {
    points: { type: 'array', items: POINT, minItems: 2 },
    closed: { type: 'boolean' },
    smooth: { type: 'boolean' },
  },
  ['points', 'closed', 'smooth'],
);

const FAMILY: JsonSchema = {
  oneOf: [
    S.object(
      {
        kind: S.enumOf(['lines'], 'čáry'),
        angle: num,
        spacing: pos,
        offset: num,
        dash: { type: 'array', items: pos },
        shift: num,
      },
      ['kind', 'angle', 'spacing', 'offset', 'dash'],
    ),
    S.object(
      {
        kind: S.enumOf(['marks'], 'značky'),
        shape: S.enumOf(['dot', 'circle', 'triangle', 'cross', 'arrow', 'hexagon'], 'tvar'),
        size: pos,
        dx: pos,
        dy: pos,
        rowShift: num,
        angle: num,
      },
      ['kind', 'shape', 'size', 'dx', 'dy', 'rowShift', 'angle'],
    ),
    S.object(
      {
        kind: S.enumOf(['wave'], 'vlnovka'),
        form: S.enumOf(['sine', 'zigzag'], 'tvar vlny'),
        amplitude: pos,
        wavelength: pos,
        spacing: pos,
        angle: num,
      },
      ['kind', 'form', 'amplitude', 'wavelength', 'spacing', 'angle'],
    ),
    S.object(
      {
        kind: S.enumOf(['motif'], 'motiv'),
        curves: { type: 'array', items: CURVE, minItems: 1 },
        dx: pos,
        dy: pos,
        rowShift: num,
        angle: num,
      },
      ['kind', 'curves', 'dx', 'dy', 'rowShift', 'angle'],
    ),
    S.object(
      {
        kind: S.enumOf(['band'], 'pás přes šířku vrstvy'),
        form: S.enumOf(['coil'], 'tvar křivky'),
        pitch: pos,
        loop: { type: 'number', exclusiveMinimum: 0, maximum: 1 },
      },
      ['kind', 'form', 'pitch', 'loop'],
    ),
  ],
};

export const HATCH_SCHEMA: JsonSchema = S.object(
  {
    id: { type: 'string' },
    name: { type: 'string' },
    group: S.enumOf(['zeminy', 'beton', 'zdivo', 'izolace', 'drevo-kov-sklo', 'ostatni'], 'skupina'),
    order: { type: 'integer', minimum: 1 },
    variantOf: { type: 'string' },
    derived: { type: 'boolean' },
    solid: { type: 'boolean' },
    families: { type: 'array', items: FAMILY },
    version: { type: 'integer', minimum: 1 },
    source: { type: 'object' },
  },
  ['id', 'name', 'group', 'order', 'derived', 'families', 'version'],
);
