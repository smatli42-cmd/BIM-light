// Styly řezu (Ardit: přepínač Instance / Styl u nástroje Řez): pojmenované předvolby hloubky pohledu
// a vzdálené oblasti. Řez se stylem bere hodnoty ze stylu; změna stylu změní všechny jeho řezy.
import type { Id } from '../../ids/index.ts';
import type { Model } from '../../model/types.ts';
import { omitIds } from '../../model/update.ts';
import type { SectionPreset } from '../../section/types.ts';
import { S } from '../schema.ts';
import { defineCommand, fail } from '../types.ts';
import { SECTION_PROPS } from './shape.ts';

const presetOf = (m: Model, id: Id): SectionPreset =>
  m.sectionPresets[id] ?? fail('not-found', `Styl řezu ${id} neexistuje`);
const put = (m: Model, p: SectionPreset): Model => {
  if (!p.name.trim()) fail('invalid', 'Název stylu řezu nesmí být prázdný');
  return { ...m, sectionPresets: { ...m.sectionPresets, [p.id]: p } };
};
const VALUES = {
  name: { type: 'string' as const },
  depth: SECTION_PROPS['depth'] ?? {},
  farClip: SECTION_PROPS['farClip'] ?? {},
};

type Values = { name?: string; depth?: number | null; farClip?: number | null };

export const sectionPresetCreate = defineCommand<Values>({
  name: 'sectionPreset.create',
  label: 'Nový styl řezu',
  description:
    'Vytvoří styl řezu: name, depth (hloubka v mm, null = neomezená), farClip (vzdálená oblast od, ' +
    'null = vypnuto).',
  group: 'Řezy a pohledy',
  params: S.object(VALUES, []),
  run(model, p, ctx) {
    const preset: SectionPreset = {
      id: ctx.newId(),
      name: p.name ?? 'Nový styl řezu',
      depth: p.depth ?? null,
      farClip: p.farClip ?? null,
    };
    return { model: put(model, preset), created: [preset.id] };
  },
});

export const sectionPresetUpdate = defineCommand<Values & { presetId: Id }>({
  name: 'sectionPreset.update',
  label: 'Upravit styl řezu',
  description:
    'Změní název, hloubku nebo vzdálenou oblast stylu řezu; platí pro všechny řezy s tímto stylem.',
  group: 'Řezy a pohledy',
  params: S.object({ presetId: S.id, ...VALUES }, ['presetId']),
  run(model, p) {
    const { presetId, ...patch } = p;
    return { model: put(model, { ...presetOf(model, presetId), ...patch }) };
  },
});

export const sectionPresetDelete = defineCommand<{ presetId: Id }>({
  name: 'sectionPreset.delete',
  label: 'Smazat styl řezu',
  description: 'Smaže styl řezu; řezy, které ho používaly, si ponechají jeho hodnoty jako vlastní.',
  group: 'Řezy a pohledy',
  params: S.object({ presetId: S.id }, ['presetId']),
  run(model, p) {
    const preset = presetOf(model, p.presetId);
    const sections = Object.fromEntries(
      Object.values(model.sections).map((s) => [
        s.id,
        s.presetId === preset.id ? { ...s, presetId: null, depth: preset.depth, farClip: preset.farClip } : s,
      ]),
    );
    return { model: { ...model, sections, sectionPresets: omitIds(model.sectionPresets, [preset.id]) } };
  },
});
