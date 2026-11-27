// Testovací scény k deskám (D1–D4; 2026-11-27). Nová scéna k deskám = nová položka nahoře.
import { vec } from '../geometry/index.ts';
import { rect } from './scene-helpers.ts';
import type { Sample } from './types.ts';

export const SLAB_SCENES: readonly Sample[] = [
  {
    key: 'podlaha-dvere',
    title: 'Podlaha pod dveřmi – proužek v otvoru',
    kind: 'scena',
    date: '2026-11-27',
    description:
      'Dvě místnosti s podlahami vázanými na místnost, v příčce 100 otvor 900 až k podlaze: každá podlaha ' +
      'vede do osy příčky (o 900 × 50 větší), vstupní otvor vlevo do osy obvodové stěny, okno s parapetem ' +
      'nic. Zkus: klik na otvor v příčce → Podlaha v otvoru (celá z A / B / žádná); posuň otvor nebo ' +
      'příčku (M); klik na podlahu → plocha v info boxu; 3D (F4) a Výkaz desek.',
    build(c) {
      const sid = c.storeyId;
      const walls = rect(c, 'Zdivo 300', 6000, 4000);
      const p = c.line(vec(3000, 0), vec(3000, 4000), {
        typeId: c.type('Příčka 100'),
        referenceLine: 'axis',
      });
      c.run('opening.create', { wallId: p, offset: 1500, width: 900, height: 2100, sill: 0 });
      const left = walls.find((w) => {
        const e = c.model.elements[w];
        return e?.category === 'wall' && e.path.start.x === 0 && e.path.end.x === 0;
      });
      if (left) {
        c.run('opening.create', { wallId: left, offset: 1000, width: 1000, height: 2100, sill: 0 });
        c.run('opening.create', { wallId: left, offset: 2600, width: 900, height: 1200, sill: 900 });
      }
      const floor = c.slabType('Podlaha anhydrit 150');
      for (const [x, name] of [
        [1500, 'Předsíň'],
        [4500, 'Pokoj'],
      ] as const) {
        const [roomId] = c.run('room.create', { storeyId: sid, point: vec(x, 2000), name });
        c.run('slab.create', { storeyId: sid, typeId: floor, roomId });
      }
    },
  },
  {
    key: 'desky-vazba',
    title: 'Vazba desky – podlaha podle místnosti, strop podle stěn',
    kind: 'scena',
    date: '2026-11-27',
    description:
      'Byt 8 × 5 m s příčkou: nosná deska podle stěn (vazba na stěny), v každé místnosti podlaha vázaná ' +
      'na místnost, vlevo sloup (podlaha ho obchází); ve 2.NP ruční podlaha přes obě místnosti. Zkus: ' +
      'posuň příčku nebo pravou stěnu (M) – podlahy i deska se přepočítají; ruční podlaha ne. Klik na ' +
      'podlahu → info box Vazba obrysu; táhni její roh → „ručně upraveno, zamčeno“ → Obnovit vazbu. ' +
      'S → metoda Podle místnosti a klik do místnosti. Výkazy → Výkaz desek (ruční podlaha bez příčky).',
    build(c) {
      const sid = c.storeyId;
      const walls = rect(c, 'Zdivo 300', 8000, 5000);
      c.line(vec(5000, 0), vec(5000, 5000), { typeId: c.type('Příčka 125') });
      c.run('wall.rectangle', {
        storeyId: sid,
        typeId: c.type('Příčka 100'),
        a: vec(1800, 2200),
        b: vec(2200, 2600),
      });
      c.run('slab.create', {
        storeyId: sid,
        typeId: c.slabType('ŽB strop 250'),
        walls: { wallIds: walls, boundary: 'face' },
      });
      const floor = c.slabType('Podlaha anhydrit 150');
      for (const [x, name] of [
        [1000, 'Pokoj'],
        [6500, 'Kuchyně'],
      ] as const) {
        const [roomId] = c.run('room.create', { storeyId: sid, point: vec(x, 1000), name });
        c.run('slab.create', { storeyId: sid, typeId: floor, roomId });
      }
      const [s2] = c.run('storey.create', { name: '2.NP', elevation: 3000, height: 3000 });
      const box = { a: vec(0, 0), b: vec(8000, 5000) };
      c.run('wall.rectangle', { storeyId: s2, typeId: c.type('Zdivo 300'), ...box });
      const across = { kind: 'line', start: vec(5000, 0), end: vec(5000, 5000) };
      c.run('wall.create', { storeyId: s2, typeId: c.type('Příčka 125'), path: across, autoConnect: true });
      c.run('slab.create', { storeyId: s2, typeId: floor, rect: box });
    },
  },
  {
    key: 'desky-presny-otvor',
    title: 'Přesný otvor v desce – pomocné čáry, kóty, tracker',
    kind: 'scena',
    date: '2026-11-27',
    description:
      'Místnost 6 × 4 m se stropem a jedním otvorem (prostup 600 × 400). Zkus: O (Otvor) → V desce → ' +
      'Obdélník; kurzor se přichytí k rohům a hranám desky i otvoru, z rohů vedou pomocné čáry. Po prvním ' +
      'kliku klikni na číslo modré kóty (např. 1000) a napiš 800 – roh se posune; pak napiš šířku, Tab, ' +
      'hloubku a Enter. Esc, klik do otvoru: kóty k lícům stěn, klik na číslo otvor posune. Totéž u desky (S).',
    build(c) {
      rect(c, 'Zdivo 300', 6000, 4000);
      const sid = c.storeyId;
      c.run('slab.create', {
        storeyId: sid,
        typeId: c.slabType('ŽB strop 250'),
        rect: { a: vec(0, 0), b: vec(6000, 4000) },
      });
      const [hole] = c.run('slabOpening.create', {
        storeyId: sid,
        rect: { a: vec(1000, 1000), b: vec(1600, 1400) },
      });
      c.run('outline.setDistance', { elementId: hole, side: 'x+', value: 3000 });
    },
  },
  {
    key: 'desky-d4',
    title: 'D4 – vršek stěn k desce, výkaz desek, kóty k hranám desky',
    kind: 'scena',
    date: '2026-11-27',
    description:
      'Místnost 6 × 4 m s příčkou a strop 2.NP nad ní; obvodové stěny a příčka mají vršek k desce (končí na ' +
      'spodním líci stropu), samostatná stěna vpravo (mimo strop) má vršek podlaží + 1. Podlaha 1.NP s otvorem je okótovaná k hranám a rohům. ' +
      'Zkus: vybrat stěnu → info box Výška → Vršek „Vršek k desce“ / „Podlaží + 1“; v 2.NP vybrat strop a ' +
      'změnit horní hranu nebo typ – výška stěn v 1.NP se přepočítá. D (Kóta) → klik na hranu nebo roh ' +
      'desky a další hranu. Obsah → Projekt → Výkazy → Výkaz desek.',
    build(c) {
      const sid = c.storeyId;
      const walls = rect(c, 'Zdivo 300', 6000, 4000);
      const partition = c.line(vec(3000, 0), vec(3000, 4000), { typeId: c.type('Příčka 125') });
      c.line(vec(8000, 0), vec(8000, 4000));
      const [s2] = c.run('storey.create', { name: '2.NP', elevation: 3000, height: 3000 });
      const over = { a: vec(-300, -300), b: vec(6300, 4300) };
      c.run('slab.create', { storeyId: s2, typeId: c.slabType('ŽB strop 250'), rect: over });
      c.run('wall.attachTop', { wallIds: [...walls, partition] });
      const [floor] = c.run('slab.create', {
        storeyId: sid,
        typeId: c.slabType('Podlaha anhydrit 150'),
        rect: { a: vec(0, 0), b: vec(6000, 4000) },
      });
      const [hole] = c.run('slabOpening.create', {
        storeyId: sid,
        rect: { a: vec(500, 1000), b: vec(2000, 3000) },
      });
      const slab = (k: Record<string, number>) => ({ outline: 'slab', ownerId: floor, ...k });
      const opening = (k: Record<string, number>) => ({ outline: 'slabOpening', ownerId: hole, ...k });
      const dim = (refs: unknown[], offset: number) =>
        c.run('dimension.create', { kind: 'linear', refs, offset, viewId: c.viewId });
      dim([slab({ edge: 3 }), opening({ edge: 3 })], 0);
      dim([opening({ vertex: 1 }), slab({ vertex: 2 })], 0);
      dim([slab({ edge: 0 }), opening({ edge: 0 })], 0);
    },
  },
  {
    key: 'desky-otvory',
    title: 'D3 – otvory v deskách',
    kind: 'scena',
    date: '2026-11-27',
    description:
      'Místnost 6 × 4 m se stropem a podlahou: otvor pro schodiště (prořízne obě desky, v půdorysu křížem), ' +
      'prostup tvaru L (kříž v každém obdélníku zvlášť, žádná čára mimo otvor) a vpravo deska nad rovinou ' +
      'řezu s otvorem (čárkovaně). Zkus: O (Otvor) → V desce, ' +
      'obdélník dvěma kliky do desky; Esc, klik do otvoru, tažení, čtverečky v rozích, Del. Posun desky ' +
      'vezme její otvory s sebou. Exportovat IFC: IfcOpeningElement u stropu i podlahy.',
    build(c) {
      rect(c, 'Zdivo 300', 6000, 4000);
      const sid = c.storeyId;
      for (const t of ['ŽB strop 250', 'Podlaha anhydrit 150'])
        c.run('slab.create', {
          storeyId: sid,
          typeId: c.slabType(t),
          rect: { a: vec(0, 0), b: vec(6000, 4000) },
        });
      c.run('slabOpening.create', { storeyId: sid, rect: { a: vec(500, 500), b: vec(3300, 1700) } });
      c.run('slabOpening.create', {
        storeyId: sid,
        outline: [
          vec(4500, 2500),
          vec(5500, 2500),
          vec(5500, 3500),
          vec(5000, 3500),
          vec(5000, 3000),
          vec(4500, 3000),
        ],
      });
      c.run('slab.create', {
        storeyId: sid,
        typeId: c.slabType('ŽB strop 250'),
        rect: { a: vec(8000, 0), b: vec(11000, 3000) },
        topOffset: 2900,
      });
      c.run('slabOpening.create', { storeyId: sid, rect: { a: vec(9000, 1000), b: vec(10000, 2000) } });
    },
  },
  {
    key: 'desky-kresleni',
    title: 'D2 – nástroj Deska: kreslení a výběr',
    kind: 'scena',
    date: '2026-11-27',
    description:
      'Místnost tvaru L (obvodová zateplená stěna) bez desky a vedle místnost s obloukovou stěnou se ' +
      'stropem podle stěn. Zkus: S (Deska) → v info boxu metoda Podle stěn, klikni stěny místnosti L a ' +
      'Enter (přepni „líc / líc jádra“); metoda Mnohoúhelník, Obdélník, Natočený obdélník. Pak Esc, klik ' +
      'do desky vybere, tažení posune, čtverečky v rozích obrysu se táhnou, Del smaže.',
    build(c) {
      const sid = c.storeyId;
      const points = [
        vec(0, 0),
        vec(0, 5000),
        vec(3000, 5000),
        vec(3000, 2500),
        vec(6000, 2500),
        vec(6000, 0),
      ];
      c.run('wall.chain', { storeyId: sid, typeId: c.type('Obvodová zateplená 465'), points, closed: true });
      const ax = { referenceLine: 'axis' };
      const arc = [
        c.line(vec(8000, 0), vec(12000, 0), ax),
        c.run('wall.create', {
          storeyId: sid,
          typeId: c.type('Zdivo 300'),
          path: { kind: 'arc', start: vec(12000, 0), end: vec(8000, 0), bulge: 1 },
          referenceLine: 'axis',
        })[0] as string,
      ];
      c.run('slab.create', {
        storeyId: sid,
        typeId: c.slabType('ŽB strop 250'),
        walls: { wallIds: arc, boundary: 'core' },
      });
    },
  },
  {
    key: 'desky',
    title: 'D1 – desky: strop a podlaha',
    kind: 'scena',
    date: '2026-11-27',
    description:
      'Místnost 6 × 4 m: podlaha (P1, horní líc ±0) a pod ní ŽB strop (D1, −150) přesahující pod stěny, ' +
      'vedle deska ve tvaru L. Podesta nad rovinou řezu je čárkovaně. Vrstva Desky v Obsahu desky skryje; ' +
      'Exportovat IFC a v BIMvision zkontrolovat IfcSlab a IfcCovering.',
    build(c) {
      rect(c, 'Zdivo 300', 6000, 4000);
      const sid = c.storeyId;
      c.run('slab.create', {
        storeyId: sid,
        typeId: c.slabType('ŽB strop 250'),
        rect: { a: vec(-300, -300), b: vec(6300, 4300) },
      });
      c.run('slab.create', {
        storeyId: sid,
        typeId: c.slabType('Podlaha anhydrit 150'),
        rect: { a: vec(0, 0), b: vec(6000, 4000) },
      });
      c.run('slab.create', {
        storeyId: sid,
        typeId: c.slabType('ŽB strop 250'),
        outline: [
          vec(8000, 0),
          vec(12000, 0),
          vec(12000, 1500),
          vec(9500, 1500),
          vec(9500, 4000),
          vec(8000, 4000),
        ],
      });
      c.run('slab.create', {
        storeyId: sid,
        typeId: c.slabType('ŽB strop 250'),
        rect: { a: vec(1000, 1000), b: vec(2500, 2200) },
        topOffset: 1500,
      });
    },
  },
];
