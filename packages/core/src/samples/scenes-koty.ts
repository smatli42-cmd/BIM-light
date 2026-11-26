// Testovací scény ke kótám (pokyny uživatele 2026-11-26 a 27): hrany otvorů, oblouky, kóta celé stěny,
// zámeček a posun čísla. Nová scéna ke kótám = nová položka nahoře.
import { vec } from '../geometry/index.ts';
import { rect } from './scene-helpers.ts';
import type { Sample, SampleContext } from './types.ts';

/** Poloměr, průměr a radiální tloušťka obloukové stěny (scéna Kóty). */
function arcDims(c: SampleContext, wallId: string) {
  const ref = { wallId, face: 'ref' as const };
  for (const [measure, point] of [
    ['radius', vec(15500, 4500)],
    ['diameter', vec(15000, 1200)],
  ] as const)
    c.run('dimension.createSet', { viewId: c.viewId, items: [{ kind: 'length', ref, measure }], point });
  c.run('dimension.createSet', {
    viewId: c.viewId,
    items: [{ kind: 'linear', refs: [ref, { wallId, face: 'opp' }] }],
    point: vec(17000, 4000),
  });
}

/** Řada kót pod domem přes příčku (scéna Kóty). */
function rowAcross(c: SampleContext, right: string, p: string, left: string) {
  c.run('dimension.createSet', {
    viewId: c.viewId,
    items: [
      {
        kind: 'linear',
        refs: [
          { wallId: right, face: 'opp' },
          { wallId: p, face: 'ref' },
        ],
      },
      {
        kind: 'linear',
        refs: [
          { wallId: p, face: 'ref' },
          { wallId: p, face: 'opp' },
        ],
      },
      {
        kind: 'linear',
        refs: [
          { wallId: p, face: 'opp' },
          { wallId: left, face: 'opp' },
        ],
      },
    ],
    point: vec(5000, -1500),
  });
}

export const DIMENSION_SCENES: readonly Sample[] = [
  {
    key: 'kota-cislo',
    title: 'Kóty – zámeček jen u vybrané, posun čísla',
    kind: 'scena',
    date: '2026-11-27',
    description:
      'Zámečky nejsou vidět, dokud kótu nevybereš (klik na kótovací čáru). U vybrané kóty táhni číslo po ' +
      'čáře – i ven z krátké kóty (čára se prodlouží). Pravé tlačítko → Číslo kóty doprostřed.',
    build(c) {
      const t = c.type('Příčka 100');
      const xs = [0, 150, 3000, 3150, 6000];
      const ids = xs.map((x) => c.line(vec(x, 0), vec(x, 3000), { typeId: t, autoConnect: false }));
      const items = ids.slice(1).map((id, i) => ({
        kind: 'linear',
        refs: [
          { wallId: ids[i], face: 'ref' },
          { wallId: id, face: 'ref' },
        ],
      }));
      const dims = c.run('dimension.createSet', { viewId: c.viewId, items, point: vec(3000, 3800) });
      c.run('dimension.setTextShift', { dimensionIds: [dims[2] ?? ''], shift: 600 });
    },
  },
  {
    key: 'kota-cela-stena',
    title: 'Kóta celé stěny se všemi stěnami',
    kind: 'scena',
    date: '2026-11-26',
    description:
      'Nástroj Kóta (D) → v info boxu „Celou stěnu“ (+ i šířky všech stěn) → klik na spodní stěnu, druhý ' +
      'klik položí řetěz s tloušťkami rohů, okny a příčkami. Totéž z pravého tlačítka na stěně. Levá je hotová.',
    build(c) {
      const [, , bottom, left] = rect(c, 'Obvodová zateplená 465', 12000, 8000, 'new');
      for (const x of [4000, 8000]) c.line(vec(x, 0), vec(x, 8000), { typeId: c.type('Příčka 125') });
      c.line(vec(0, 4500), vec(4000, 4500), { typeId: c.type('Příčka 100') });
      for (const offset of [1500, 5500, 9500])
        c.run('opening.create', { wallId: bottom, offset, width: 1200, height: 1500, sill: 900 });
      c.run('opening.create', { wallId: left, offset: 1500, width: 1000, height: 2100, sill: 0 });
      c.run('dimension.wholeWall', { wallId: left, viewId: c.viewId, walls: true });
    },
  },
  {
    key: 'koty',
    title: 'Oprava – kótování otvorů, oblouků a řady přes příčku',
    kind: 'scena',
    date: '2026-11-26',
    description:
      'Nástroj Kóta (D): chytni hrany bouraného otvoru a niky ve spodní stěně; na oblouku hranu otvoru a čelo ' +
      '(délka po oblouku na líci blíž kliknutí); klik na oblouk a do volna = poloměr / průměr (volba v info ' +
      'boxu); tloušťka oblouku radiálně. Řada pod domem přes příčku má odkazové čáry stejně dlouhé.',
    build(c) {
      const [, right = '', bottom, left = ''] = rect(c, 'Obvodová zateplená 465', 10000, 6000, 'existing');
      const p = c.line(vec(5000, 0), vec(5000, 6000), { typeId: c.type('Příčka 125') });
      c.run('opening.create', {
        wallId: bottom,
        offset: 1500,
        width: 900,
        height: 2100,
        sill: 0,
        status: 'demolished',
      });
      c.run('opening.create', {
        wallId: bottom,
        offset: 7000,
        width: 600,
        height: 1200,
        sill: 900,
        kind: 'niche',
        depth: 150,
        side: 'ref',
      });
      rowAcross(c, right, p, left);
      const arc = { kind: 'arc', start: vec(14000, 0), end: vec(14000, 6000), bulge: 1 };
      const [a] = c.run('wall.create', { storeyId: c.storeyId, typeId: c.type('Zdivo 300'), path: arc });
      c.run('opening.create', { wallId: a, offset: 3500, width: 1000, height: 1500, sill: 900 });
      arcDims(c, a ?? '');
    },
  },
];
