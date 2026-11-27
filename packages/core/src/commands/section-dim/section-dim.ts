// Příkazy délkové kóty v řezu (Revit / Archicad: kóta v řezu): vložení mezi dvě úrovně (svislá) nebo dva
// boky prvků (vodorovná), posun kótovací čáry, zámek. Mazání jako u výškových kót (levelDim.delete,
// selection.delete levelDimIds). Undo jako vše.
import type { Id } from '../../ids/index.ts';
import type { Model } from '../../model/types.ts';
import { isSideRef, type SectionDimension, type SectionDimRef } from '../../section-dim/types.ts';
import { sectionRefCoord } from '../../section-dim/value.ts';
import { SECTION_LAYER } from '../../style/presets/defaults.ts';
import { REF } from '../level-dim/level-dim.ts';
import { S, type JsonSchema } from '../schema.ts';
import { sectionOf } from '../section/section.ts';
import { defineCommand, fail } from '../types.ts';

const DIM_REF: JsonSchema = {
  oneOf: [
    ...(REF.oneOf ?? []),
    S.object(
      { kind: { type: 'string', enum: ['side'] }, elementId: S.id, side: S.enumOf(['left', 'right'], 'bok') },
      ['kind', 'elementId', 'side'],
    ),
  ],
  description:
    'odkaz kóty: úroveň jako u výškové kóty (storey / edge / terrain – svislá kóta), nebo { kind: "side", ' +
    'elementId, side: "left" | "right" } = levý / pravý okraj stěny či desky na výkrese řezu (vodorovná)',
};

const dimOf = (m: Model, id: Id): SectionDimension =>
  m.sectionDims[id] ?? fail('not-found', `Kóta v řezu ${id} neexistuje`);

function put(m: Model, d: SectionDimension): Model {
  const s = sectionOf(m, d.sectionId);
  if (sectionRefCoord(m, s, d.a) === null || sectionRefCoord(m, s, d.b) === null)
    fail('not-found', 'Kótovaný prvek ani úroveň v řezu není');
  return { ...m, sectionDims: { ...m.sectionDims, [d.id]: d } };
}

export const sectionDimCreate = defineCommand<{
  sectionId: Id;
  a: SectionDimRef;
  b: SectionDimRef;
  offset: number;
  annotationLayerId?: Id;
}>({
  name: 'sectionDim.create',
  label: 'Kóta v řezu',
  description:
    'Vloží délkovou kótu do řezu nebo pohledu: a, b = dvě úrovně (svislá kóta výšek) nebo dva boky prvků ' +
    '(vodorovná kóta po výkrese); offset = poloha kótovací čáry (u svislé u v mm po výkrese, u vodorovné z ' +
    'v mm). Hodnota se počítá z modelu (dotaz sectionDim.list), cíle viz levelDim.targets a sectionDim.sides.',
  group: 'Kóta',
  params: S.object(
    { sectionId: S.id, a: DIM_REF, b: DIM_REF, offset: S.number('mm'), annotationLayerId: S.id },
    ['sectionId', 'a', 'b', 'offset'],
  ),
  run(model, p, ctx) {
    if (isSideRef(p.a) !== isSideRef(p.b)) fail('invalid', 'Kóta spojuje dvě úrovně, nebo dva boky prvků');
    const d: SectionDimension = {
      id: ctx.newId(),
      sectionId: p.sectionId,
      orientation: isSideRef(p.a) ? 'horizontal' : 'vertical',
      a: p.a,
      b: p.b,
      offset: p.offset,
      annotationLayerId: p.annotationLayerId ?? SECTION_LAYER.id,
      locked: false,
    };
    return { model: put(model, d), created: [d.id] };
  },
});

export const sectionDimUpdate = defineCommand<{ dimId: Id; offset?: number; locked?: boolean }>({
  name: 'sectionDim.update',
  label: 'Upravit kótu v řezu',
  description: 'Posune kótovací čáru (offset v mm) nebo zamkne / odemkne kótu. Zamčenou nejde posunout.',
  group: 'Kóta',
  params: S.object({ dimId: S.id, offset: S.number('mm'), locked: { type: 'boolean' } }, ['dimId']),
  run(model, p) {
    const d = dimOf(model, p.dimId);
    if (d.locked && p.offset !== undefined) fail('lock-violation', 'Kóta je zamčená');
    return {
      model: put(model, { ...d, offset: p.offset ?? d.offset, locked: p.locked ?? d.locked }),
    };
  },
});
