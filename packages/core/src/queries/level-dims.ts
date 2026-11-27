// Dotazy na výškové kóty v řezech (ČSN 01 3420): seznam s hodnotou spočítanou z modelu a místa, kam jde kótu
// přichytit (úrovně podlaží a hrany prvků viditelných v řezu).
import { S } from '../commands/schema.ts';
import { sectionOf } from '../commands/section/section.ts';
import { levelTargets } from '../level-dim/targets.ts';
import { absoluteText, elevationText, levelZ } from '../level-dim/value.ts';
import { planLevelTexts } from '../level-dim/plan.ts';
import { defineQuery } from './types.ts';

export const levelDimList = defineQuery<{ sectionId?: string }, unknown>({
  name: 'levelDim.list',
  label: 'Výškové kóty',
  description:
    'Výškové kóty v řezech (volitelně jen sectionId): id, řez, odkaz (ref), z = výška nad ±0,000 v mm ' +
    'spočítaná z modelu, text tak, jak je na výkrese (±0,000 / +2,750 / -0,450, absolutní „m n. m.“), ' +
    'poloha praporku at, below, absolute, locked.',
  group: 'Řezy a pohledy',
  params: S.object({ sectionId: S.id }, []),
  run: (m, p) =>
    Object.values(m.levelDims)
      .filter((d) => !p.sectionId || d.sectionId === p.sectionId)
      .map((d) => {
        const z = levelZ(m, d.ref);
        const text = z === null ? null : d.absolute ? absoluteText(m, z) : elevationText(z);
        return { ...d, z, text };
      }),
});

export const levelDimTargets = defineQuery<{ sectionId: string }, unknown>({
  name: 'levelDim.targets',
  label: 'Kam dát výškovou kótu',
  description:
    'Úrovně a hrany, na které jde v řezu dát výškovou kótu: ref (pro levelDim.create), z (mm nad ±0,000), ' +
    'rozsah u0–u1 po výkrese, kde hrana leží (úroveň podlaží přes celý výkres = null).',
  group: 'Řezy a pohledy',
  params: S.object({ sectionId: S.id }, ['sectionId']),
  run: (m, p) => {
    sectionOf(m, p.sectionId);
    return levelTargets(m, p.sectionId).map((t) => ({
      ...t,
      u0: Number.isFinite(t.u0) ? t.u0 : null,
      u1: Number.isFinite(t.u1) ? t.u1 : null,
    }));
  },
});

export const planLevelDimList = defineQuery<{ storeyId?: string }, unknown>({
  name: 'planLevelDim.list',
  label: 'Výškové kóty v půdorysu',
  description:
    'Výškové kóty v půdorysu (volitelně jen storeyId): id, podlaží, ref (deska / podlaží), point, textAt, ' +
    'marker, text (hodnota k ±0,000, jak je na výkrese), second (výška nad úrovní podlaží), z v mm.',
  group: 'Kóta',
  params: S.object({ storeyId: S.id }, []),
  run: (m, p) =>
    Object.values(m.planLevelDims)
      .filter((d) => !p.storeyId || d.storeyId === p.storeyId)
      .map((d) => ({ ...d, z: levelZ(m, d.ref), ...(planLevelTexts(m, d) ?? { main: null, second: null }) }))
      .map(({ main, ...r }) => ({ ...r, text: main })),
});
