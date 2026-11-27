// Spárořez v půdorysu jako volba stylu (prvky stavby 9, základ 27): styl mění jen vzhled.
import type { Id } from '../../ids/index.ts';
import { setDisplay } from '../../model/update.ts';
import { styleOf } from '../lookup.ts';
import { S } from '../schema.ts';
import { defineCommand } from '../types.ts';

export const styleSetTileJoints = defineCommand<{ styleId: Id; visible: boolean | null }>({
  name: 'style.setTileJoints',
  label: 'Spárořez v půdorysu',
  description:
    'Zapne / vypne kreslení spárořezu dlažby v půdorysu pro pohledy se stylem. null = výchozí (kreslí se při ' +
    'střední a jemné podrobnosti, tj. styl Projekt ano, Studie ne).',
  group: 'Zobrazení',
  params: S.object(
    { styleId: S.id, visible: { oneOf: [{ type: 'boolean' }, { type: 'null' }], description: 'zapnuto' } },
    ['styleId', 'visible'],
  ),
  run(model, p) {
    const { tileJoints: _old, ...style } = styleOf(model, p.styleId);
    const next = p.visible === null ? style : { ...style, tileJoints: p.visible };
    const d = model.display;
    return { model: setDisplay(model, { ...d, styles: { ...d.styles, [style.id]: next } }) };
  },
});
