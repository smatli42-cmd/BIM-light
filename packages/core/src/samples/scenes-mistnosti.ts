// Testovací scény k místnostem (prvky stavby 9; 2026-11-27). Nová scéna k místnostem = nová položka nahoře.
import { vec } from '../geometry/index.ts';
import { rect } from './scene-helpers.ts';
import type { Sample } from './types.ts';

export const ROOM_SCENES: readonly Sample[] = [
  {
    key: 'mistnosti',
    title: 'Místnosti – plocha podle ČSN 73 4301, razítko, výpis',
    kind: 'scena',
    date: '2026-11-27',
    description:
      'Byt 8 × 6 m: obývací pokoj se sloupem (odečte se) a výklenkem 1 × 0,3 m (započítá se), ložnice, ' +
      'koupelna a chodba bez místnosti. Zkus: N (Místnost) → klik do chodby, kurzor ukáže obrys a plochu; ' +
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
      for (const [x, y, name] of [
        [1200, 1200, 'Obývací pokoj'],
        [6200, 1500, 'Ložnice'],
        [6200, 4500, 'Koupelna'],
      ] as const)
        c.run('room.create', { storeyId: sid, point: vec(x, y), name });
    },
  },
];
