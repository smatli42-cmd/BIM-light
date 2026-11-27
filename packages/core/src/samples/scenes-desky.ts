// Testovací scény k deskám (D1, D2; 2026-11-27). Nová scéna k deskám = nová položka nahoře.
import { vec } from '../geometry/index.ts';
import { rect } from './scene-helpers.ts';
import type { Sample } from './types.ts';

export const SLAB_SCENES: readonly Sample[] = [
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
