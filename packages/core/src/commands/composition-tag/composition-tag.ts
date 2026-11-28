// Příkazy popisu skladby v řezu (Revit Multi-layer tag, Archicad Composite label): vložení na řezanou stěnu
// nebo desku (bod uchycení na výkrese + poloha textu), posun textu / bodu, volby obsahu (číslování,
// tloušťky, název typu, obrácené pořadí), vrstva, zámek. Mazání jako u kót v řezu (levelDim.delete,
// selection.delete levelDimIds). Text se nezadává – počítá se z typu prvku. Undo jako vše.
import { anchorOf, anchorPoint, cutRowOf, tagLayers } from '../../composition-tag/content.ts';
import {
  TAG_DEFAULTS,
  type CompositionTag,
  type CompositionTagOptions,
} from '../../composition-tag/types.ts';
import type { Vec2 } from '../../geometry/index.ts';
import type { Id } from '../../ids/index.ts';
import type { Model } from '../../model/types.ts';
import { SECTION_LAYER } from '../../style/presets/defaults.ts';
import { S, type JsonSchema } from '../schema.ts';
import { sectionOf } from '../section/section.ts';
import { defineCommand, fail } from '../types.ts';

export const compositionTagOf = (m: Model, id: Id): CompositionTag =>
  m.compositionTags[id] ?? fail('not-found', `Popis skladby ${id} neexistuje`);

const OPTIONS: Record<keyof CompositionTagOptions, JsonSchema> = {
  numbered: { type: 'boolean', description: 'čísla vrstev 1., 2. … (jinak pomlčka)' },
  thickness: { type: 'boolean', description: 'tloušťka vrstvy v mm za materiálem' },
  title: { type: 'boolean', description: 'první řádek: značka a název typu s celkovou tloušťkou' },
  reverse: { type: 'boolean', description: 'obrácené pořadí (deska zdola nahoru, stěna od druhé strany)' },
};

function put(m: Model, t: CompositionTag): Model {
  const s = sectionOf(m, t.sectionId);
  if (!cutRowOf(m, s, t.elementId))
    fail('not-found', 'Prvek rovina řezu neprotíná (popis jen u řezané stěny nebo desky)');
  if (m.display.layers[t.annotationLayerId]?.kind !== 'annotation')
    fail('not-found', 'Vrstva popisu musí být skupina anotací');
  return { ...m, compositionTags: { ...m.compositionTags, [t.id]: t } };
}

type CreateParams = Partial<CompositionTagOptions> & {
  sectionId: Id;
  elementId: Id;
  at: Vec2;
  textAt?: Vec2;
  annotationLayerId?: Id;
};

export const compositionTagCreate = defineCommand<CreateParams>({
  name: 'compositionTag.create',
  label: 'Popis skladby',
  description:
    'Vloží do řezu popis skladby řezané stěny nebo desky: odkazová čára od bodu at (u, z na výkrese řezu, ' +
    'v ploše prvku) k textu v textAt (výchozí vpravo nahoře). Text = vrstvy typu v pořadí (deska shora ' +
    'dolů, stěna od referenční strany), počítá se z modelu (dotaz compositionTag.list). Řezané prvky viz ' +
    'section.elements (cut), bod v prvku section.pick.',
  group: 'Řezy a pohledy',
  params: S.object(
    {
      sectionId: S.id,
      elementId: S.id,
      at: S.point,
      textAt: S.point,
      ...OPTIONS,
      annotationLayerId: S.id,
    },
    ['sectionId', 'elementId', 'at'],
  ),
  run(model, p, ctx) {
    const s = sectionOf(model, p.sectionId);
    const row = cutRowOf(model, s, p.elementId);
    if (!row) fail('not-found', 'Prvek rovina řezu neprotíná (popis jen u řezané stěny nebo desky)');
    if (!tagLayers(model, p.elementId, p.at.y, false)) fail('invalid', 'Prvek nemá skladbu');
    const anchor = anchorOf(row, p.at);
    const k = s.scale * 10;
    const offset = p.textAt ? { x: p.textAt.x - p.at.x, y: p.textAt.y - p.at.y } : { x: k, y: k };
    const t: CompositionTag = {
      id: ctx.newId(),
      sectionId: p.sectionId,
      elementId: p.elementId,
      anchor,
      offset,
      numbered: p.numbered ?? TAG_DEFAULTS.numbered,
      thickness: p.thickness ?? TAG_DEFAULTS.thickness,
      title: p.title ?? TAG_DEFAULTS.title,
      reverse: p.reverse ?? TAG_DEFAULTS.reverse,
      annotationLayerId: p.annotationLayerId ?? SECTION_LAYER.id,
      locked: false,
    };
    return { model: put(model, t), created: [t.id] };
  },
});

export const compositionTagMove = defineCommand<{ tagId: Id; textAt?: Vec2; at?: Vec2 }>({
  name: 'compositionTag.move',
  label: 'Posunout popis skladby',
  description:
    'Posune text popisu skladby (textAt = nový začátek poličky na výkrese) nebo bod uchycení (at, zůstane ' +
    'v ploše prvku). Zamčený popis nejde posunout.',
  group: 'Řezy a pohledy',
  params: S.object({ tagId: S.id, textAt: S.point, at: S.point }, ['tagId']),
  run(model, p) {
    const t = compositionTagOf(model, p.tagId);
    if (t.locked) fail('lock-violation', 'Popis skladby je zamčený');
    const row = cutRowOf(model, sectionOf(model, t.sectionId), t.elementId);
    if (!row) fail('not-found', 'Prvek rovina řezu už neprotíná');
    const old = anchorPoint(row, t.anchor);
    const anchor = p.at ? anchorOf(row, p.at) : t.anchor;
    const at = anchorPoint(row, anchor);
    const text = p.textAt ?? { x: old.x + t.offset.x, y: old.y + t.offset.y };
    return { model: put(model, { ...t, anchor, offset: { x: text.x - at.x, y: text.y - at.y } }) };
  },
});

export const compositionTagUpdate = defineCommand<
  Partial<CompositionTagOptions> & { tagId: Id; annotationLayerId?: Id; locked?: boolean }
>({
  name: 'compositionTag.update',
  label: 'Upravit popis skladby',
  description:
    'Změní obsah popisu skladby (numbered, thickness, title, reverse), vrstvu (skupina anotací) nebo zámek. ' +
    'Zamčený jde jen odemknout.',
  group: 'Řezy a pohledy',
  params: S.object({ tagId: S.id, ...OPTIONS, annotationLayerId: S.id, locked: { type: 'boolean' } }, [
    'tagId',
  ]),
  run(model, p) {
    const t = compositionTagOf(model, p.tagId);
    const { tagId: _id, ...patch } = p;
    if (t.locked && !Object.keys(patch).every((k) => k === 'locked'))
      fail('lock-violation', 'Popis skladby je zamčený');
    return { model: put(model, { ...t, ...patch }) };
  },
});

export const COMPOSITION_TAG_COMMANDS = [
  compositionTagCreate,
  compositionTagMove,
  compositionTagUpdate,
] as const;
