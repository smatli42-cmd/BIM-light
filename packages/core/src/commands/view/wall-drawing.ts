// Kresba stěn ve stylu (plán stěn Z6): konce stěn (čelní čára volného konce) a značka referenční čáry.
// Zapíše se do grafiky kategorie stěna ve stylu (patro 2), takže pravidlo nebo přepis prvku ji může změnit
// a funkce grafiky řekne proč (základ 11).
import type { Id } from '../../ids/index.ts';
import { setDisplay } from '../../model/update.ts';
import { styleOf } from '../lookup.ts';
import { S } from '../schema.ts';
import { defineCommand } from '../types.ts';

export const styleSetWallDrawing = defineCommand<{ styleId: Id; endLines?: boolean; refLine?: boolean }>({
  name: 'style.setWallDrawing',
  label: 'Kresba stěn ve stylu',
  description:
    'Nastaví ve stylu kresbu stěn: endLines = čelní čára u volného konce stěny (výchozí zapnuto), ' +
    'refLine = značka referenční čáry tenkou čerchovanou čarou (výchozí vypnuto). Platí pro všechny ' +
    'pohledy se stylem; pravidlo nebo přepis prvku ji může změnit.',
  group: 'Zobrazení',
  params: S.object({ styleId: S.id, endLines: { type: 'boolean' }, refLine: { type: 'boolean' } }, [
    'styleId',
  ]),
  run(model, p) {
    const style = styleOf(model, p.styleId);
    const d = model.display;
    const wall = {
      ...style.categoryGraphics.wall,
      ...(p.endLines === undefined ? {} : { endLines: p.endLines }),
      ...(p.refLine === undefined ? {} : { refLine: p.refLine }),
    };
    const next = { ...style, categoryGraphics: { ...style.categoryGraphics, wall } };
    return { model: setDisplay(model, { ...d, styles: { ...d.styles, [style.id]: next } }) };
  },
});
