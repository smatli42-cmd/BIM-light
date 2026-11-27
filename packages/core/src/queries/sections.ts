// Dotaz na řezy a pohledy pro AI, Obsah a 3D okno („Řez A / Řez B“ ve 3D: rovina `cutPlane3d`).
import { sectionOf } from '../commands/section/section.ts';
import { S } from '../commands/schema.ts';
import { sectionContent } from '../section/content.ts';
import { sectionCutPlane3d, sectionFrame } from '../section/frame.ts';
import { defineQuery } from './types.ts';

export const sectionList = defineQuery<Record<string, never>, unknown>({
  name: 'section.list',
  label: 'Řezy a pohledy',
  description:
    'Řezy a pohledy (fasády) projektu: id, druh (section = řez, elevation = pohled), název, označení, ' +
    'čára (start, end v mm), směr pohledu (left / right od start → end) a jednotkový vektor look, délka ' +
    'čáry, hloubka (mm, null = bez omezení), rozsah výšky (null = celá budova), měřítko, styl (id a název), ' +
    'filtr rekonstrukce a cutPlane3d (rovina řezu pro 3D: origin, normal = směr pohledu).',
  group: 'Řezy a pohledy',
  params: S.object({}, []),
  run: (m) =>
    Object.values(m.sections).map((s) => {
      const f = sectionFrame(s);
      return {
        id: s.id,
        kind: s.kind,
        name: s.name,
        mark: s.mark,
        start: s.start,
        end: s.end,
        direction: s.direction,
        look: f.look,
        length: Math.round(f.length),
        depth: s.depth,
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
