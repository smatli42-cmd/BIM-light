// Příkazy popisu skladby v řezu (česká výkresová praxe; Revit Multi-layer tag, Archicad Composite label):
// vložení na řezanou stěnu nebo desku (bod uchycení + body lomené odkazové čáry), posun bodu / konce čáry /
// celé čáry, volby obsahu (kolečko s číslem, název typu, tloušťky, číslování, pořadí, strana řádků), vrstva,
// zámek. Mazání jako u kót v řezu (levelDim.delete, selection.delete levelDimIds). Text se nezadává – počítá
// se z typu prvku. Pravidlo „první úsek kolmo ke konstrukci“ hlídá jádro (leader.ts). Undo jako vše.
import { anchorOf, anchorPoint, cutRowOf, tagLayers } from '../../composition-tag/content.ts';
import { leaderAxis, moveLeaderEnd, normalizeLeader, onPerpendicular } from '../../composition-tag/leader.ts';
import {
  TAG_DEFAULTS,
  COMPOSITION_TAG_ALIGNS,
  COMPOSITION_TAG_SIDES,
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
  mark: { type: 'boolean', description: 'kolečko s číslem konstrukce (značka typu) na konci čáry' },
  title: { type: 'boolean', description: 'první řádek: název typu s celkovou tloušťkou' },
  thickness: { type: 'boolean', description: 'tloušťka vrstvy „tl. 20 mm“ za materiálem' },
  numbered: { type: 'boolean', description: 'čísla vrstev 1., 2. …' },
  reverse: { type: 'boolean', description: 'obrácené pořadí (deska zdola nahoru, stěna od druhé strany)' },
  side: S.enumOf(COMPOSITION_TAG_SIDES, 'řádky vpravo / vlevo od svislé čáry'),
  align: S.enumOf(COMPOSITION_TAG_ALIGNS, 'zarovnání řádků vlevo / na střed / vpravo'),
};
const POINTS: JsonSchema = {
  type: 'array',
  items: S.point,
  minItems: 1,
  description:
    'body odkazové čáry na výkrese řezu (mm) za bodem uchycení: první se srovná na kolmici ke konstrukci ' +
    '(deska svisle, stěna vodorovně), další lomí čáru; poslední = kolečko s číslem, pod ním řádky',
};

const NOT_CUT = 'Prvek rovina řezu neprotíná (popis jen u řezané stěny nebo desky)';
const LOCKED = 'Popis skladby je zamčený';

function put(m: Model, t: CompositionTag): Model {
  const s = sectionOf(m, t.sectionId);
  if (!cutRowOf(m, s, t.elementId)) fail('not-found', NOT_CUT);
  if (m.display.layers[t.annotationLayerId]?.kind !== 'annotation')
    fail('not-found', 'Vrstva popisu musí být skupina anotací');
  return { ...m, compositionTags: { ...m.compositionTags, [t.id]: t } };
}

/** Body čáry z bodů výkresu (vůči bodu uchycení, první na kolmici). */
function leaderFrom(m: Model, elementId: Id, at: Vec2, pts: readonly Vec2[]): Vec2[] {
  const rel = pts.map((p) => ({ x: p.x - at.x, y: p.y - at.y }));
  return normalizeLeader(leaderAxis(m, elementId), rel) ?? fail('invalid', 'Odkazová čára je nulová');
}

type CreateParams = Partial<CompositionTagOptions> & {
  sectionId: Id;
  elementId: Id;
  at: Vec2;
  points?: Vec2[];
  annotationLayerId?: Id;
};

export const compositionTagCreate = defineCommand<CreateParams>({
  name: 'compositionTag.create',
  label: 'Popis skladby',
  description:
    'Vloží do řezu popis skladby řezané stěny nebo desky: bod at (u, z na výkrese, v ploše prvku), points = ' +
    'body lomené odkazové čáry (výchozí jeden bod kolmo 15 mm na papíře od bodu). Čára konstrukci protne ' +
    'kolmo, na konci kolečko s číslem konstrukce, pod ním vrstvy typu (deska shora dolů, stěna od ' +
    'referenční strany) – počítá se z modelu (dotaz compositionTag.list). Řezané prvky viz section.elements.',
  group: 'Řezy a pohledy',
  params: S.object(
    { sectionId: S.id, elementId: S.id, at: S.point, points: POINTS, ...OPTIONS, annotationLayerId: S.id },
    ['sectionId', 'elementId', 'at'],
  ),
  run(model, p, ctx) {
    const s = sectionOf(model, p.sectionId);
    const row = cutRowOf(model, s, p.elementId) ?? fail('not-found', NOT_CUT);
    if (!tagLayers(model, p.elementId, p.at.y, false)) fail('invalid', 'Prvek nemá skladbu');
    const anchor = anchorOf(row, p.at);
    const at = anchorPoint(row, anchor);
    const k = s.scale * 15;
    const leader = p.points
      ? leaderFrom(model, p.elementId, at, p.points)
      : [onPerpendicular(leaderAxis(model, p.elementId), { x: k, y: k })];
    const { sectionId, elementId, at: _at, points: _p, annotationLayerId, ...opts } = p;
    const t: CompositionTag = {
      ...TAG_DEFAULTS,
      ...opts,
      id: ctx.newId(),
      sectionId,
      elementId,
      anchor,
      leader,
      annotationLayerId: annotationLayerId ?? SECTION_LAYER.id,
      locked: false,
    };
    return { model: put(model, t), created: [t.id] };
  },
});

export const compositionTagMove = defineCommand<{ tagId: Id; at?: Vec2; points?: Vec2[]; delta?: Vec2 }>({
  name: 'compositionTag.move',
  label: 'Posunout popis skladby',
  description:
    'Posune popis skladby: delta = posun kolečka s řádky (konec čáry; úseky zůstanou vodorovné / svislé, ' +
    'z rovné čáry vznikne lomená), points = nové body celé čáry (na výkrese), at = nový bod uchycení ' +
    '(v ploše prvku; čára se posune s ním). Zamčený popis nejde posunout.',
  group: 'Řezy a pohledy',
  params: S.object({ tagId: S.id, at: S.point, points: POINTS, delta: S.point }, ['tagId']),
  run(model, p) {
    const t = compositionTagOf(model, p.tagId);
    if (t.locked) fail('lock-violation', LOCKED);
    const row = cutRowOf(model, sectionOf(model, t.sectionId), t.elementId) ?? fail('not-found', NOT_CUT);
    const anchor = p.at ? anchorOf(row, p.at) : t.anchor;
    const at = anchorPoint(row, anchor);
    const axis = leaderAxis(model, t.elementId);
    let leader: readonly Vec2[] = p.points ? leaderFrom(model, t.elementId, at, p.points) : t.leader;
    if (p.delta) leader = moveLeaderEnd(axis, leader, p.delta) ?? leader;
    return { model: put(model, { ...t, anchor, leader }) };
  },
});

export const compositionTagUpdate = defineCommand<
  Partial<CompositionTagOptions> & { tagId: Id; annotationLayerId?: Id; locked?: boolean }
>({
  name: 'compositionTag.update',
  label: 'Upravit popis skladby',
  description:
    'Změní obsah popisu skladby (mark = kolečko s číslem, title, thickness, numbered, reverse = pořadí, ' +
    'side = strana řádků, align = zarovnání řádků), vrstvu (skupina anotací) nebo zámek. Zamčený jde jen odemknout.',
  group: 'Řezy a pohledy',
  params: S.object({ tagId: S.id, ...OPTIONS, annotationLayerId: S.id, locked: { type: 'boolean' } }, [
    'tagId',
  ]),
  run(model, p) {
    const t = compositionTagOf(model, p.tagId);
    const { tagId: _id, ...patch } = p;
    if (t.locked && !Object.keys(patch).every((k) => k === 'locked')) fail('lock-violation', LOCKED);
    return { model: put(model, { ...t, ...patch }) };
  },
});

export const COMPOSITION_TAG_COMMANDS = [
  compositionTagCreate,
  compositionTagMove,
  compositionTagUpdate,
] as const;
