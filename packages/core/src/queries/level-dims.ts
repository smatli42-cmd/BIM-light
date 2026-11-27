// Dotazy na výškové kóty v řezech (ČSN 01 3420): seznam s hodnotou spočítanou z modelu a místa, kam jde kótu
// přichytit (úrovně podlaží a hrany prvků viditelných v řezu).
import { S } from '../commands/schema.ts';
import { sectionOf } from '../commands/section/section.ts';
import { levelTargets } from '../level-dim/targets.ts';
import { absoluteText, elevationText, levelZ } from '../level-dim/value.ts';
import { planLevelPoint, planLevelTexts } from '../level-dim/plan.ts';
import { sectionDimPoints } from '../section-dim/draw.ts';
import { sideTargets } from '../section-dim/value.ts';
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
    'Výškové kóty v půdorysu (volitelně jen storeyId): id, podlaží, marker (box = výška podlahy v rámečku, ' +
    'circle = kóta terénu RT / UT u nároží), ref, point (u rohu stěny spočítaný), textAt, rt / ut (mm), ' +
    'anchor (roh stěny), lines = řádky textu jak jsou na výkrese, text = první řádek, z v mm (rámeček).',
  group: 'Kóta',
  params: S.object({ storeyId: S.id }, []),
  run: (m, p) =>
    Object.values(m.planLevelDims)
      .filter((d) => !p.storeyId || d.storeyId === p.storeyId)
      .map((d) => {
        const style = Object.values(m.views).find((v) => v.storeyId === d.storeyId)?.styleId;
        const lines = planLevelTexts(m, d, style ? m.display.styles[style] : undefined);
        const z = d.marker === 'box' ? levelZ(m, d.ref) : null;
        return { ...d, point: planLevelPoint(m, d), z, lines, text: lines?.[0] ?? null };
      }),
});

export const sectionDimList = defineQuery<{ sectionId?: string }, unknown>({
  name: 'sectionDim.list',
  label: 'Kóty v řezu',
  description:
    'Délkové kóty v řezech (volitelně jen sectionId): id, řez, orientation (vertical / horizontal), odkazy a, b, ' +
    'offset, value = kótovaná délka v mm spočítaná z modelu (null = odkaz neplatí), locked.',
  group: 'Kóta',
  params: S.object({ sectionId: S.id }, []),
  run: (m, p) =>
    Object.values(m.sectionDims)
      .filter((d) => !p.sectionId || d.sectionId === p.sectionId)
      .map((d) => {
        const s = m.sections[d.sectionId];
        const pts = s ? sectionDimPoints(m, s, d) : null;
        const value = pts ? Math.round(Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y)) : null;
        return { ...d, value };
      }),
});

export const sectionDimSides = defineQuery<{ sectionId: string }, unknown>({
  name: 'sectionDim.sides',
  label: 'Boky prvků v řezu',
  description:
    'Levé a pravé okraje stěn a desek na výkrese řezu: ref (pro sectionDim.create, vodorovná kóta), u (mm po ' +
    'výkrese), výškový rozsah prvku z0–z1.',
  group: 'Kóta',
  params: S.object({ sectionId: S.id }, ['sectionId']),
  run: (m, p) => sideTargets(m, sectionOf(m, p.sectionId)),
});
