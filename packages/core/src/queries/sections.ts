// Dotaz na řezy a pohledy pro AI, Obsah a 3D okno („Řez A / Řez B“ ve 3D: rovina `cutPlane3d`).
import { sectionOf } from '../commands/section/section.ts';
import { S } from '../commands/schema.ts';
import { sectionContent } from '../section/content.ts';
import { effectiveFrame, sectionCutPlane3d } from '../section/frame.ts';
import { sectionLimits } from '../section/types.ts';
import { defineQuery } from './types.ts';

export const sectionList = defineQuery<Record<string, never>, unknown>({
  name: 'section.list',
  label: 'Řezy a pohledy',
  description:
    'Řezy a pohledy (fasády) projektu: id, druh (section = řez, elevation = pohled), název, označení, ' +
    'čára (points v mm, jogged = zalomený), směr pohledu (left / right od směru čáry) a vektor look, ' +
    'šířka výkresu, styl řezu (presetId, presetName), účinná hloubka depth a vzdálená oblast farClip ' +
    '(mm, null = neomezená / vypnuto), vrstva značky, rozsah výšky (null = celá budova), měřítko, styl ' +
    'zobrazení (id a název), ' +
    'filtr rekonstrukce a cutPlane3d (rovina řezu pro 3D: origin, normal = směr pohledu).',
  group: 'Řezy a pohledy',
  params: S.object({}, []),
  run: (m) =>
    Object.values(m.sections).map((s) => {
      const f = effectiveFrame(m.sectionPresets, s);
      return {
        id: s.id,
        kind: s.kind,
        name: s.name,
        mark: s.mark,
        points: s.points,
        jogged: s.points.length > 2,
        presetId: s.presetId,
        presetName: s.presetId ? (m.sectionPresets[s.presetId]?.name ?? '') : null,
        ...sectionLimits(m.sectionPresets, s),
        annotationLayerId: s.annotationLayerId,
        direction: s.direction,
        look: f.look,
        length: Math.round(f.length),
        range: s.range,
        scale: s.scale,
        styleId: s.styleId,
        styleName: m.display.styles[s.styleId]?.name ?? '',
        phaseFilterId: s.phaseFilterId,
        cutPlane3d: sectionCutPlane3d(s),
      };
    }),
});

export const sectionElementsQuery = defineQuery<{ sectionId: string }, unknown>({
  name: 'section.elements',
  label: 'Obsah řezu',
  description:
    'Co řez ukazuje (stejný výpočet jako kresba): cut = prvky proříznuté rovinou řezu (elementId, ' +
    'category, rozsah na výkrese u0–u1 v mm od levého okraje, bottom–top v mm nad ±0,000, materialIds ' +
    'vrstev), seen = prvky za rovinou do hloubky pohledu (depth = nejbližší vzdálenost za rovinou v mm, ' +
    'u0–u1). Pohled (fasáda) nemá cut. Prvky skryté filtrem rekonstrukce nebo vrstvou chybí.',
  group: 'Řezy a pohledy',
  params: S.object({ sectionId: S.id }, ['sectionId']),
  run: (m, p) => sectionContent(m, sectionOf(m, p.sectionId)),
});

export const sectionPresetList = defineQuery<Record<string, never>, unknown>({
  name: 'sectionPreset.list',
  label: 'Styly řezu',
  description:
    'Styly řezu: id, název, hloubka a vzdálená oblast (mm, null = neomezená / vypnuto), počet řezů.',
  group: 'Řezy a pohledy',
  params: S.object({}, []),
  run: (m) =>
    Object.values(m.sectionPresets).map((p) => ({
      ...p,
      used: Object.values(m.sections).filter((s) => s.presetId === p.id).length,
    })),
});
