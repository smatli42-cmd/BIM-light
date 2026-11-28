// Dotaz na řezy a pohledy pro AI, Obsah a 3D okno („Řez A / Řez B“ ve 3D: rovina `cutPlane3d`).
import { sectionOf } from '../commands/section/section.ts';
import { S } from '../commands/schema.ts';
import { sectionContent } from '../section/content.ts';
import { sectionPickAt, sectionPickBox } from '../section/pick.ts';
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
    'filtr rekonstrukce, cutPlane3d (rovina řezu pro 3D: origin, normal = směr pohledu) a auto ' +
    '(automatický pohled kolem budovy: "follow" = čára jde za obálkou, "locked" = ručně posunutý, null = ' +
    'ruční řez / pohled). Smazané automatické pohledy: viz dotaz elevation.around.',
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
        auto: s.auto ? (s.auto.locked ? 'locked' : 'follow') : null,
      };
    }),
});

export const elevationAround = defineQuery<Record<string, never>, unknown>({
  name: 'elevation.around',
  label: 'Pohledy kolem budovy',
  description:
    'Automatické pohledy 1–4 kolem budovy: margin = odstup čar od obálky (mm), removed = označení ' +
    'smazaných (samy se nevrátí; obnoví je příkaz elevation.create), locked = označení ručně posunutých.',
  group: 'Řezy a pohledy',
  params: S.object({}, []),
  run: (m) => ({
    margin: m.elevationsAround.margin,
    removed: m.elevationsAround.removed,
    locked: Object.values(m.sections)
      .filter((s) => s.auto?.locked)
      .map((s) => s.mark),
  }),
});

export const sectionElementsQuery = defineQuery<{ sectionId: string }, unknown>({
  name: 'section.elements',
  label: 'Obsah řezu',
  description:
    'Co řez ukazuje (stejný výpočet jako kresba): cut = prvky proříznuté rovinou řezu (elementId, ' +
    'category, rozsah na výkrese u0–u1 v mm od levého okraje, bottom–top v mm nad ±0,000, materialIds ' +
    'vrstev, pieces = řezané kusy po vrstvách s materiálem a rozsahem – uložení stropu: zdivo končí pod ' +
    'deskou, zateplení jde přes čelo), seen = prvky za rovinou do hloubky pohledu (depth = nejbližší vzdálenost za rovinou v mm, ' +
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

export const sectionPick = defineQuery<
  { sectionId: string; u: number; z: number; tolerance?: number },
  unknown
>({
  name: 'section.pick',
  label: 'Prvky v bodě řezu',
  description:
    'Prvky pod bodem výkresu řezu (u mm po výkrese, z mm nad ±0,000), nejbližší první: řezané, pak za rovinou ' +
    'podle hloubky, otvor před svou stěnou. tolerance v mm (výchozí 50). Výběr pak přes id (stěny, desky, otvory).',
  group: 'Řezy a pohledy',
  params: S.object(
    { sectionId: S.id, u: S.number('mm'), z: S.number('mm'), tolerance: S.number('mm', { minimum: 0 }) },
    ['sectionId', 'u', 'z'],
  ),
  run: (m, p) => sectionPickAt(m, sectionOf(m, p.sectionId), { x: p.u, y: p.z }, p.tolerance ?? 50),
});

export const sectionPickBoxQuery = defineQuery<
  { sectionId: string; a: { x: number; y: number }; b: { x: number; y: number }; crossing?: boolean },
  unknown
>({
  name: 'section.pickBox',
  label: 'Prvky v rámečku řezu',
  description:
    'Prvky v rámečku na výkrese řezu (a, b = rohy, x = u, y = z v mm): crossing = i protnuté (rámeček zprava ' +
    'doleva), jinak jen celé (zleva doprava).',
  group: 'Řezy a pohledy',
  params: S.object({ sectionId: S.id, a: S.point, b: S.point, crossing: { type: 'boolean' } }, [
    'sectionId',
    'a',
    'b',
  ]),
  run: (m, p) => sectionPickBox(m, sectionOf(m, p.sectionId), p.a, p.b, p.crossing ?? false),
});
