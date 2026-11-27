// Výplň praporku výškové kóty ve stylu (ČSN 01 3420 vs. vzor Arditu): podle ČSN je relativní kóta nevyplněná
// a absolutní plná; styl může kreslit všechny plné (jako Ardit).
import type { Id } from '../../ids/index.ts';
import { styleOf } from '../lookup.ts';
import { S } from '../schema.ts';
import { defineCommand } from '../types.ts';
import { setDisplay } from '../../model/update.ts';

export const styleSetLevelMarkFill = defineCommand<{ styleId: Id; filled: boolean }>({
  name: 'style.setLevelMarkFill',
  label: 'Plné výškové kóty',
  description:
    'Výšková kóta v řezech se stylem: filled = true kreslí trojúhelník vždy plný (vzor Arditu), false = podle ' +
    'ČSN 01 3420 (relativní nevyplněná, absolutní plná).',
  group: 'Zobrazení',
  params: S.object({ styleId: S.id, filled: { type: 'boolean' } }, ['styleId', 'filled']),
  run(model, p) {
    const { levelMarkFilled: _old, ...style } = styleOf(model, p.styleId);
    const next = p.filled ? { ...style, levelMarkFilled: true } : style;
    const d = model.display;
    return { model: setDisplay(model, { ...d, styles: { ...d.styles, [style.id]: next } }) };
  },
});
