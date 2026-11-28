// Testovací scény střech (rozhodnutí 11, krok S1): valbová, sedlová se štíty a L s úžlabím a různými
// sklony; řez napříč valbovou střechou. Jen příkazy z registru (stejná cesta jako AI).
import { vec } from '../geometry/index.ts';
import type { Sample, SampleContext } from './types.ts';

const roofType = (c: SampleContext, name: string) =>
  Object.values(c.model.roofTypes).find((t) => t.name === name)?.id ?? '';

/** Obvodové stěny; `top` = výška stěn (nadezdívka pod střechou podkroví), jinak výška podlaží. */
function walls(c: SampleContext, pts: readonly [number, number][], top?: number) {
  const points = pts.map(([x, y]) => vec(x, y));
  const height = top && { baseStoreyId: c.storeyId, baseOffset: 0, top: { kind: 'height', value: top } };
  const typeId = c.type('Zdivo 300');
  c.run('wall.chain', { storeyId: c.storeyId, typeId, points, closed: true, ...(height && { height }) });
}

const L: [number, number][] = [
  [28000, 0],
  [40000, 0],
  [40000, 6000],
  [34000, 6000],
  [34000, 12000],
  [28000, 12000],
];

export const ROOF_SCENES: readonly Sample[] = [
  {
    key: 'strechy',
    title: 'Střechy S1 – valbová, sedlová se štíty, L s úžlabím',
    kind: 'scena',
    date: '2026-11-28',
    description:
      'Tři střechy nad obdélníky stěn: vlevo valbová 35° (přesah 500), uprostřed sedlová 40° se štíty, ' +
      'vpravo L s úžlabím a různými sklony (45° / 30°) s ref. čárou jen 400 nad podlahou (podkroví, nadezdívka 400). ' +
      'Hřebeny, nároží a úžlabí se spočítají. V půdorysu: střecha nad rovinou řezu čárkovaně, u L pod ' +
      'rovinou řezu plně a průsečík s rovinou řezu perem řezu. Zkus: klik na hranu střechy (okap, hřeben) ' +
      'ji vybere – info box: Typ, Sklon, Ref. čára nad podlahou, Ref. čára (abs.), Přesah, Úhel okapu, Okap ' +
      '(abs.), Skladba, hrany (sklon / štít a sklon každé hrany). Přepni hranu na štít – roviny se přepočítají. ' +
      'Tažení posune, Del smaže, Ctrl+Z vrátí. Obsah → Projekt → Řezy → Řez A: vrstvy střechy se šrafami. ' +
      'Přidej &3d do adresy: tělesa vrstev v barvách materiálů, klik vybere střechu.',
    build(c) {
      const r1 = roofType(c, 'Šikmá střecha, pálená krytina');
      const r2 = roofType(c, 'Šikmá střecha, plechová krytina');
      walls(c, [
        [0, 0],
        [10000, 0],
        [10000, 6000],
        [0, 6000],
      ]);
      walls(c, [
        [14000, 0],
        [24000, 0],
        [24000, 6000],
        [14000, 6000],
      ]);
      walls(c, L, 400);
      const base = { storeyId: c.storeyId, refOffset: 3000 };
      const hip = { a: vec(0, 0), b: vec(10000, 6000) };
      c.run('roof.create', { ...base, typeId: r1, rect: hip, shape: 'hip', slope: 35 });
      const gable = { a: vec(14000, 0), b: vec(24000, 6000) };
      c.run('roof.create', { ...base, typeId: r2, rect: gable, shape: 'gable', slope: 40 });
      const outline = L.map(([x, y]) => vec(x, y));
      const [l] = c.run('roof.create', { ...base, typeId: r1, outline, slope: 45, refOffset: 400 });
      c.run('roof.setEdge', { roofId: l, indices: [1, 2], slope: 30 });
      const styleId = Object.values(c.model.display.styles).find((s) => s.name === 'Projekt')?.id;
      c.run('section.create', { start: vec(5000, -3000), end: vec(5000, 9000), styleId });
    },
  },
];
