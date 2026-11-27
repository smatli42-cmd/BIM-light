// Dotaz pro AI: dočasné kóty desky nebo otvoru v desce (co uživatel vidí po výběru; katalog kreslení 3).
import { elementOutlineTempDimensions } from '../dimension/outline-temp.ts';
import { S } from '../commands/schema.ts';
import { defineQuery } from './types.ts';

const r1 = (v: number) => Math.round(v * 10) / 10;

export const outlineTempDimensionList = defineQuery<{ elementId: string }, unknown>({
  name: 'outline.tempDimensions',
  label: 'Dočasné kóty desky / otvoru',
  description:
    'Vzdálenosti desky nebo otvoru v desce k nejbližšímu líci stěny / hraně desky na 4 strany (side x-, x+, ' +
    'y-, y+; mm), od čeho a k čemu se měří (other). Změna: příkaz outline.setDistance.',
  group: 'Deska',
  params: S.object({ elementId: S.id }, ['elementId']),
  run: (m, p) =>
    elementOutlineTempDimensions(m, p.elementId).map((t) => ({
      side: t.side,
      value: r1(t.value),
      from: { x: r1(t.from.x), y: r1(t.from.y) },
      to: { x: r1(t.to.x), y: r1(t.to.y) },
      other: t.other,
      parallel: t.parallel,
    })),
});
