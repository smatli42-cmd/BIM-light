// JSON schéma šrafy (základy 31, 34): kontroluje import balíčku zobrazení a popisuje šrafu pro AI.
import { S, type JsonSchema } from '../commands/schema.ts';

const num: JsonSchema = { type: 'number' };
const pos: JsonSchema = { type: 'number', exclusiveMinimum: 0 };

const FAMILY: JsonSchema = {
  oneOf: [
    S.object(
      {
        kind: S.enumOf(['lines'], 'čáry'),
        angle: num,
        spacing: pos,
        offset: num,
        dash: { type: 'array', items: pos },
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
  ],
};

export const HATCH_SCHEMA: JsonSchema = S.object(
  {
    id: { type: 'string' },
    name: { type: 'string' },
    group: S.enumOf(['zeminy', 'beton', 'zdivo', 'izolace', 'drevo-kov-sklo', 'ostatni'], 'skupina'),
    order: { type: 'integer', minimum: 1 },
    variantOf: { type: 'string' },
    solid: { type: 'boolean' },
    families: { type: 'array', items: FAMILY },
    version: { type: 'integer', minimum: 1 },
    source: { type: 'object' },
  },
  ['id', 'name', 'group', 'order', 'families', 'version'],
);
