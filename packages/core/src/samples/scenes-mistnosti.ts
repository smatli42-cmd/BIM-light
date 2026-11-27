// Testovací scény k místnostem (prvky stavby 9; 2026-11-27). Nová scéna k místnostem = nová položka nahoře.
import { vec } from '../geometry/index.ts';
import { rect } from './scene-helpers.ts';
import type { Sample } from './types.ts';

export const ROOM_SCENES: readonly Sample[] = [
  {
    key: 'sparorez',
    title: 'Spárořez – dlažba a obklad, odřezy, úzké řezy, počátek',
    kind: 'scena',
    date: '2026-11-27',
    description:
      'Koupelna 2,3 × 2,1 m s oknem a dveřmi: dlažba 600×600 na střed s počátkem posunutým o 100 mm, takže ' +
      'u stěn vzniknou úzké řezy (posun X 0, Y 200 je odstraní), obklad 300×600 od rohu do 2,10 m; WC: dlažba 300×300 na osu spáry. Styl Projekt ' +
      'kreslí spárořez dlažby v půdorysu. Zkus: klik do koupelny → info box, sekce Povrchy → Spárořez (celé, ' +
      'řezané, úzké řezy); táhni křížek počátku dlažby v půdorysu, nebo zadej posun X / Y číslem – řezy se ' +
      'hned přepočítají; posuň příčku – spárořez se přepočítá. Obsah → Výkazy → Výkaz dlaždic (prořez 10 %).',
    build(c) {
      const sid = c.storeyId;
      const [top, , , left] = rect(c, 'Obvodová zateplená 465', 4000, 2100);
      const partition = c.line(vec(2400, 0), vec(2400, 2100), {
        typeId: c.type('Příčka 125'),
        referenceLine: 'axis',
      });
      c.run('opening.create', { wallId: partition, offset: 500, width: 700, height: 1970, sill: 0 });
      c.run('opening.create', { wallId: top, offset: 800, width: 900, height: 600, sill: 1500 });
      c.run('opening.create', { wallId: left, offset: 600, width: 800, height: 1970, sill: 0 });
      const [bath] = c.run('room.create', { storeyId: sid, point: vec(1200, 1000), name: 'Koupelna' });
      const [wc] = c.run('room.create', { storeyId: sid, point: vec(3200, 1000), name: 'WC' });
      c.run('covering.setZones', {
        roomId: bath,
        zones: [
          { typeId: 'cov-tiling-300x600', top: 2100 },
          { typeId: 'cov-paint-white', top: null },
        ],
      });
      c.run('covering.assign', { roomId: bath, place: 'floor', typeId: 'cov-floor-tiles-600' });
      c.run('covering.setOrigin', { roomId: bath, place: 'floor', offset: { x: 100, y: 0 } });
      const [small] = c.run('coveringType.create', {
        name: 'Dlažba 300×300 béžová',
        kind: 'floor-tiles',
        materialId: 'mat-cov-paint-beige',
        tile: { width: 300, height: 300, joint: 3, jointColor: '#8a7a60', align: 'axis' },
      });
      c.run('covering.assign', { roomId: wc, place: 'floor', typeId: small });
      const view = c.model.views[c.viewId];
      const project = Object.values(c.model.display.styles).find((s) => s.name === 'Projekt');
      if (view && project) c.run('view.setStyle', { viewId: c.viewId, styleId: project.id });
    },
  },
  {
    key: 'povrchy',
    title: 'Povrchy místností – zóny, obklad, dlažba, ostění, výkaz',
    kind: 'scena',
    date: '2026-11-27',
    description:
      'Koupelna: obklad do 1,50 m a nad ním malba, stěna s oknem má vlastní obklad do 2,10 m, dlažba a ' +
      'podhled; pokoj: sokl 80 mm, béžová malba, vinyl. Razítko ukazuje povrchy z přiřazení. Zkus: klik do ' +
      'koupelny → info box, sekce Povrchy (zóny, podlaha, strop, plochy po typech); klik kousek od líce ' +
      'stěny uvnitř místnosti vybere stěnu → Vlastní zóny této stěny; posuň okno nebo příčku – plochy se ' +
      'přepočítají a přiřazení zůstane. Obsah → Výkazy → Výkaz povrchů (otvory do 4 m² se neodečítají).',
    build(c) {
      const sid = c.storeyId;
      const [top, , , left] = rect(c, 'Obvodová zateplená 465', 7000, 4000);
      const partition = c.line(vec(3000, 0), vec(3000, 4000), {
        typeId: c.type('Příčka 125'),
        referenceLine: 'axis',
      });
      c.run('opening.create', { wallId: partition, offset: 600, width: 800, height: 2000, sill: 0 });
      c.run('opening.create', { wallId: top, offset: 1000, width: 900, height: 600, sill: 1500 });
      c.run('opening.create', { wallId: top, offset: 4200, width: 1800, height: 1500, sill: 900 });
      c.run('opening.create', { wallId: left, offset: 1200, width: 1200, height: 1500, sill: 900 });
      const [bath] = c.run('room.create', { storeyId: sid, point: vec(1500, 2000), name: 'Koupelna' });
      const [living] = c.run('room.create', { storeyId: sid, point: vec(5000, 2000), name: 'Pokoj' });
      c.run('covering.setZones', {
        roomId: bath,
        zones: [
          { typeId: 'cov-tiling-300x600', top: 1500 },
          { typeId: 'cov-paint-white', top: null },
        ],
      });
      c.run('covering.setZones', {
        roomId: bath,
        wallId: top,
        side: 'ref',
        zones: [
          { typeId: 'cov-tiling-300x600', top: 2100 },
          { typeId: 'cov-paint-white', top: null },
        ],
      });
      c.run('covering.assign', { roomId: bath, place: 'floor', typeId: 'cov-floor-tiles-600' });
      c.run('covering.assign', { roomId: bath, place: 'ceiling', typeId: 'cov-ceiling-sdk' });
      c.run('covering.setZones', {
        roomId: living,
        zones: [
          { typeId: 'cov-skirting-tiles', top: 80 },
          { typeId: 'cov-paint-beige', top: null },
        ],
      });
      c.run('covering.assign', { roomId: living, place: 'floor', typeId: 'cov-vinyl-oak' });
      c.run('covering.assign', { roomId: living, place: 'ceiling', typeId: 'cov-paint-white' });
      const styleId = c.model.views[c.viewId]?.styleId;
      const fields = ['number', 'name', 'area', 'floorFinish', 'wallFinish', 'ceilingFinish'];
      if (styleId) c.run('style.setRoomStamp', { styleId, fields });
    },
  },
  {
    key: 'mistnosti',
    title: 'Místnosti – plocha podle ČSN 73 4301, razítko, výpis',
    kind: 'scena',
    date: '2026-11-27',
    description:
      'Byt 8 × 6 m: obývací pokoj se sloupem (odečte se) a výklenkem 1 × 0,3 m (započítá se), ložnice, ' +
      'koupelna a chodba bez místnosti; barvy podle kategorie, razítko s kategorií, podlahou a teplotou. ' +
      'Info box místnosti: kategorie, barva, povrchy, osoby, teplota a sekce Razítko (zapnout / pořadí). Zkus: N (Místnost) → klik do chodby, kurzor ukáže obrys a plochu; ' +
      'Esc, klik do místnosti nebo na razítko → info box (číslo, název, plocha), tažení razítka; posuň ' +
      'příčku – plocha se přepočítá; smaž příčku mezi ložnicí a koupelnou – koupelna je nadbytečná. ' +
      'Obsah → Výkazy → Výpis místností; Exportovat IFC (IfcSpace).',
    build(c) {
      const sid = c.storeyId;
      const [, , , left] = rect(c, 'Obvodová zateplená 465', 8000, 6000);
      const partition = { typeId: c.type('Příčka 125'), referenceLine: 'axis' };
      const wall = c.line(vec(4500, 0), vec(4500, 6000), partition);
      c.line(vec(4500, 3000), vec(8000, 3000), partition);
      c.line(vec(0, 4500), vec(4500, 4500), partition);
      c.run('opening.create', { wallId: wall, offset: 3800, width: 800, height: 2000, sill: 0 });
      c.line(vec(2000, 2200), vec(2300, 2200), { referenceLine: 'axis' });
      const niche = { kind: 'niche', side: 'ref', sill: 0, height: 2100, depth: 300 };
      c.run('opening.create', { wallId: left, offset: 1500, width: 1000, ...niche });
      const cat = (n: string) => Object.values(c.model.roomCategories).find((k) => k.name === n)?.id;
      const rooms: [number, number, string, string, Record<string, unknown>][] = [
        [
          1200,
          1200,
          'Obývací pokoj',
          'Obytné',
          { floorFinish: 'dubové parkety', occupants: 4, temperature: 20 },
        ],
        [6200, 1500, 'Ložnice', 'Obytné', { floorFinish: 'koberec', occupants: 2, temperature: 20 }],
        [
          6200,
          4500,
          'Koupelna',
          'Hygienické',
          { floorFinish: 'dlažba', wallFinish: 'obklad', temperature: 24 },
        ],
      ];
      for (const [x, y, name, category, props] of rooms) {
        const [id] = c.run('room.create', { storeyId: sid, point: vec(x, y), name });
        c.run('room.update', { roomId: id, categoryId: cat(category), ...props });
      }
      const styleId = c.model.views[c.viewId]?.styleId;
      const fields = ['number', 'name', 'area', 'category', 'floorFinish', 'temperature'];
      if (styleId) c.run('style.setRoomStamp', { styleId, fields });
    },
  },
];
