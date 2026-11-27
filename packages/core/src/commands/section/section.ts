// Příkazy řezu a pohledu (rozhodnutí 19, základy 6, 15): nový řez, úprava, posun, přejmenování, smazání.
// Řez je pohled – model (prvky) se nemění; značka řezu v půdorysu je jeho anotace (základ 28).
import { add, type Vec2 } from '../../geometry/index.ts';
import type { Id } from '../../ids/index.ts';
import type { Model } from '../../model/types.ts';
import { omitIds } from '../../model/update.ts';
import type { Section } from '../../section/types.ts';
import { S } from '../schema.ts';
import { defineCommand, fail } from '../types.ts';
import { checkSection, newSection, pointsFrom, SECTION_PROPS, type SectionShape } from './shape.ts';

export const sectionOf = (m: Model, id: Id): Section =>
  m.sections[id] ?? fail('not-found', `Řez ${id} neexistuje`);
export const putSection = (m: Model, s: Section): Model => ({ ...m, sections: { ...m.sections, [s.id]: s } });

export const sectionCreate = defineCommand<SectionShape & { name?: string }>({
  name: 'section.create',
  label: 'Řez',
  description:
    'Vytvoří řez z čáry v půdorysu: points (2 body = rovný, víc = zalomený), nebo start a end (mm). ' +
    'direction = kam se díváme (left = doleva od směru čáry, výchozí), depth = hloubka pohledu (null = ' +
    'neomezená, výchozí), farClip = vzdálená oblast od (null = vypnuto), presetId = styl řezu (přepíše ' +
    'hloubku a vzdálenou oblast), annotationLayerId = vrstva značky (výchozí Řezy a pohledy), range = ' +
    'rozsah výšky (null = celá budova), scale = měřítko (výchozí 100), mark = písmeno (výchozí další A, B…), ' +
    'name = název (výchozí „Řez A“). Značka řezu se kreslí v půdorysech protnutých podlaží.',
  group: 'Řezy a pohledy',
  icon: 'section',
  params: S.object({ ...SECTION_PROPS, name: { type: 'string' } }, []),
  run(model, p, ctx) {
    const s = newSection(model, ctx.newId(), 'section', p);
    return { model: putSection(model, s), created: [s.id] };
  },
});

type UpdateParams = SectionShape & { sectionId: Id; phaseFilterId?: Id | null };

export const sectionUpdate = defineCommand<UpdateParams>({
  name: 'section.update',
  label: 'Upravit řez',
  description:
    'Změní řez nebo pohled: čáru (points, nebo jen krajní body start / end), směr pohledu, hloubku, ' +
    'vzdálenou oblast, styl řezu (presetId), vrstvu značky, rozsah výšky, měřítko, styl zobrazení (místní ' +
    'úpravy se zruší), označení, filtr rekonstrukce (phaseFilterId, null = vše). Chybějící parametr zůstane.',
  group: 'Řezy a pohledy',
  params: S.object(
    { sectionId: S.id, ...SECTION_PROPS, phaseFilterId: { oneOf: [S.id, { type: 'null' }] } },
    ['sectionId'],
  ),
  run(model, p) {
    const s = sectionOf(model, p.sectionId);
    if (p.phaseFilterId && model.display.overrideCombinations[p.phaseFilterId]?.phase !== true)
      fail('not-found', `Předvolba fáze ${p.phaseFilterId} neexistuje`);
    const { sectionId: _id, start: _s, end: _e, points: _p, ...patch } = p;
    const restyled = p.styleId !== undefined && p.styleId !== s.styleId;
    const next: Section = {
      ...s,
      ...patch,
      points: pointsFrom(p, s.points),
      ...(restyled ? { local: {} } : {}),
    };
    return { model: putSection(model, checkSection(model, next)) };
  },
});

export const sectionMove = defineCommand<{ sectionId: Id; delta: Vec2 }>({
  name: 'section.move',
  label: 'Posunout řez',
  description: 'Posune celou čáru řezu o vektor delta (mm); směr, hloubka a ostatní zůstanou.',
  group: 'Řezy a pohledy',
  params: S.object({ sectionId: S.id, delta: S.point }, ['sectionId', 'delta']),
  run(model, p) {
    const s = sectionOf(model, p.sectionId);
    return { model: putSection(model, { ...s, points: s.points.map((q) => add(q, p.delta)) }) };
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
  description: 'Smaže řez nebo pohled i se značkou v půdorysu a jeho výškovými kótami (model se nemění).',
  group: 'Řezy a pohledy',
  params: S.object({ sectionId: S.id }, ['sectionId']),
  run(model, p) {
    sectionOf(model, p.sectionId);
    const dims = Object.values(model.levelDims).filter((d) => d.sectionId === p.sectionId);
    const m = { ...model, sections: omitIds(model.sections, [p.sectionId]) };
    return {
      model: {
        ...m,
        levelDims: omitIds(
          m.levelDims,
          dims.map((d) => d.id),
        ),
        sectionDims: Object.fromEntries(
          Object.entries(m.sectionDims).filter(([, d]) => d.sectionId !== p.sectionId),
        ),
      },
    };
  },
});
