// Dotaz: úchopy vybraných prvků v řezu (horní a spodní hrana stěny, desky, otvoru) a výšky pro přichycení –
// AI vidí totéž, co uživatel při tažení (příkaz element.setEdgeLevel).
import { sectionOf } from '../commands/section/section.ts';
import { S, type JsonSchema } from '../commands/schema.ts';
import { sectionGrips, sectionSnapLevels } from '../section/grips.ts';
import { defineQuery } from './types.ts';

export const sectionGripsQuery = defineQuery<{ sectionId: string; elementIds: string[] }, unknown>({
  name: 'section.grips',
  label: 'Úchopy v řezu',
  description:
    'Úchopy prvků (stěny, desky, otvory) na výkrese řezu: grips = elementId, edge (top / bottom), u a z (mm), ' +
    'label a value (Výška stěny, Spodek = odsazení od podlaží, Horní / Spodní líc desky od podlaží, Parapet, ' +
    'Výška otvoru v mm); snap = výšky z pro přichycení (úrovně podlaží, hrany ostatních prvků). Tažení = ' +
    'příkaz element.setEdgeLevel.',
  group: 'Řezy a pohledy',
  params: S.object({ sectionId: S.id, elementIds: { type: 'array', items: S.id } as JsonSchema }, [
    'sectionId',
    'elementIds',
  ]),
  run: (m, p) => {
    const s = sectionOf(m, p.sectionId);
    const grips = sectionGrips(m, s, p.elementIds);
    const snap = p.elementIds.length === 1 ? sectionSnapLevels(m, s, p.elementIds[0] as string) : [];
    return { grips, snap: snap.map((l) => ({ z: Math.round(l.z), label: l.label })) };
  },
});
