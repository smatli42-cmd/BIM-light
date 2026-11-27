// Příkazy řezu a pohledu (rozhodnutí 19, základy 6, 15): nový řez, úprava, přejmenování, smazání.
// Řez je pohled – model (prvky) se nemění; značka řezu v půdorysu je jeho anotace (základ 28).
import { dist, type Vec2 } from '../../geometry/index.ts';
import type { Id } from '../../ids/index.ts';
import type { Model } from '../../model/types.ts';
import { omitIds } from '../../model/update.ts';
import {
  DEFAULT_SECTION_DEPTH,
  DEFAULT_SECTION_SCALE,
  nextSectionMark,
  SECTION_DIRECTIONS,
  type Section,
  type SectionDirection,
  type SectionKind,
  type SectionRange,
} from '../../section/types.ts';
import { styleOf } from '../lookup.ts';
import { S, type JsonSchema } from '../schema.ts';
import { defineCommand, fail } from '../types.ts';

export const sectionOf = (m: Model, id: Id): Section =>
  m.sections[id] ?? fail('not-found', `Řez ${id} neexistuje`);
export const putSection = (m: Model, s: Section): Model => ({ ...m, sections: { ...m.sections, [s.id]: s } });

const RANGE: JsonSchema = {
  oneOf: [
    S.object({ bottom: { type: 'number' }, top: { type: 'number' } }, ['bottom', 'top']),
    { type: 'null' },
  ],
  description: 'rozsah výšky kresby v mm nad ±0,000; null = celá budova',
};
const DEPTH: JsonSchema = {
  oneOf: [{ type: 'number', exclusiveMinimum: 0 }, { type: 'null' }],
  description: 'hloubka pohledu za rovinou řezu v mm; null = bez omezení',
};

/** Společné parametry tvaru řezu (create i update). */
export const SECTION_PROPS: Record<string, JsonSchema> = {
  start: S.point,
  end: S.point,
  direction: S.enumOf(
    SECTION_DIRECTIONS,
    'kam se díváme: left = doleva od směru start → end, right = doprava',
  ),
  depth: DEPTH,
  range: RANGE,
  scale: S.number('měřítko (jmenovatel, 100 = 1:100)', { exclusiveMinimum: 0 }),
  styleId: S.id,
  mark: { type: 'string', description: 'označení ve značce (A, B…)' },
};

export function checkSection(m: Model, s: Section): Section {
  if (dist(s.start, s.end) < 100) fail('invalid', 'Čára řezu musí být dlouhá aspoň 100 mm');
  if (s.range && s.range.top <= s.range.bottom) fail('invalid', 'Rozsah výšky: vršek musí být nad spodkem');
  if (!s.name.trim() || !s.mark.trim()) fail('invalid', 'Název ani označení nesmí být prázdné');
  styleOf(m, s.styleId);
  return s;
}

export interface SectionShape {
  start: Vec2;
  end: Vec2;
  direction?: SectionDirection;
  depth?: number | null;
  range?: SectionRange | null;
  scale?: number;
  styleId?: Id;
  mark?: string;
}

const usedMarks = (m: Model, kind: SectionKind) =>
  Object.values(m.sections)
    .filter((s) => s.kind === kind)
    .map((s) => s.mark);

/**
 * Skupina anotací značky řezu: první viditelná ve všech stylech (výchozí projekt: Kresba 2D), aby značka
 * byla vidět v půdorysu Studie i Projektu (Revit: značka řezu ve všech půdorysech); jinak výchozí stylu.
 */
export function sharedAnnotationLayer(m: Model, fallback: Id): Id {
  const styles = Object.values(m.display.styles);
  const shown = Object.values(m.display.layers).find(
    (l) =>
      l.kind === 'annotation' &&
      styles.every(
        (st) => m.display.layerCombinations[st.layerCombinationId]?.states[l.id]?.visible !== false,
      ),
  );
  return shown?.id ?? fallback;
}

/** Nový řez / pohled s výchozím stylem (styl prvního půdorysu) a společnou skupinou anotací. */
export function newSection(
  m: Model,
  id: Id,
  kind: SectionKind,
  p: SectionShape & { name?: string },
): Section {
  const styleId = p.styleId ?? Object.values(m.views)[0]?.styleId ?? '';
  const style = styleOf(m, styleId);
  const mark = p.mark ?? nextSectionMark(usedMarks(m, kind));
  return checkSection(m, {
    id,
    kind,
    name: p.name ?? (kind === 'section' ? `Řez ${mark}` : `Pohled ${mark}`),
    mark,
    start: p.start,
    end: p.end,
    direction: p.direction ?? 'left',
    depth: p.depth === undefined ? (kind === 'section' ? DEFAULT_SECTION_DEPTH : null) : p.depth,
    range: p.range ?? null,
    scale: p.scale ?? DEFAULT_SECTION_SCALE,
    styleId,
    local: {},
    elementOverrides: {},
    phaseFilterId: null,
    annotationLayerId: sharedAnnotationLayer(m, style.defaultAnnotationLayerId),
  });
}

export const sectionCreate = defineCommand<SectionShape & { name?: string }>({
  name: 'section.create',
  label: 'Nový řez',
  description:
    'Vytvoří řez z čáry v půdorysu (start, end v mm). direction = kam se díváme (left = doleva od směru ' +
    'start → end, výchozí), depth = hloubka pohledu (výchozí 15 m, null = bez omezení), range = rozsah ' +
    'výšky (null = celá budova), scale = měřítko (výchozí 100), mark = písmeno (výchozí další volné A, B…), ' +
    'name = název (výchozí „Řez A“). Značka řezu se kreslí v půdorysech protnutých podlaží.',
  group: 'Řezy a pohledy',
  params: S.object({ ...SECTION_PROPS, name: { type: 'string' } }, ['start', 'end']),
  run(model, p, ctx) {
    const s = newSection(model, ctx.newId(), 'section', p);
    return { model: putSection(model, s), created: [s.id] };
  },
});

type UpdateParams = Partial<SectionShape> & { sectionId: Id; phaseFilterId?: Id | null };

export const sectionUpdate = defineCommand<UpdateParams>({
  name: 'section.update',
  label: 'Upravit řez',
  description:
    'Změní řez nebo pohled: čáru (start, end), směr pohledu, hloubku, rozsah výšky, měřítko, styl ' +
    '(místní úpravy se zruší), označení, filtr rekonstrukce (phaseFilterId, null = vše). Chybějící parametr ' +
    'zůstane beze změny.',
  group: 'Řezy a pohledy',
  params: S.object(
    { sectionId: S.id, ...SECTION_PROPS, phaseFilterId: { oneOf: [S.id, { type: 'null' }] } },
    ['sectionId'],
  ),
  run(model, p) {
    const s = sectionOf(model, p.sectionId);
    if (p.phaseFilterId && model.display.overrideCombinations[p.phaseFilterId]?.phase !== true)
      fail('not-found', `Předvolba fáze ${p.phaseFilterId} neexistuje`);
    const { sectionId: _id, ...patch } = p;
    const restyled = p.styleId !== undefined && p.styleId !== s.styleId;
    const next: Section = { ...s, ...patch, ...(restyled ? { local: {} } : {}) };
    return { model: putSection(model, checkSection(model, next)) };
  },
});

export const sectionRename = defineCommand<{ sectionId: Id; name: string }>({
  name: 'section.rename',
  label: 'Přejmenovat řez',
  description: 'Změní název řezu nebo pohledu (zobrazuje se v Obsahu a v záhlaví okna řezu).',
  group: 'Řezy a pohledy',
  params: S.object({ sectionId: S.id, name: { type: 'string' } }, ['sectionId', 'name']),
  run(model, p) {
    const s = sectionOf(model, p.sectionId);
    return { model: putSection(model, checkSection(model, { ...s, name: p.name.trim() })) };
  },
});

export const sectionDelete = defineCommand<{ sectionId: Id }>({
  name: 'section.delete',
  label: 'Smazat řez',
  description: 'Smaže řez nebo pohled i se značkou v půdorysu (model se nemění).',
  group: 'Řezy a pohledy',
  params: S.object({ sectionId: S.id }, ['sectionId']),
  run(model, p) {
    sectionOf(model, p.sectionId);
    return { model: { ...model, sections: omitIds(model.sections, [p.sectionId]) } };
  },
});
