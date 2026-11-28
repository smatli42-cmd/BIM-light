// Testovací scéna k prioritám spojování vrstev (pokyn uživatele 2026-11-28): dům tvaru L se zateplenými
// obvodovými stěnami, ve vnitřním rohu na ně navazuje nezateplená zeď (přístavek), příčka do T a strop
// na obvodových zdech s řezem. Na vnitřním rohu je hned vidět, kdo koho projede.
import { vec } from '../geometry/index.ts';
import type { Sample } from './types.ts';

/** Vnitřní líc po směru hodin (tloušťka jde ven); vnitřní roh v bodě [3]. */
const OUTLINE = [vec(0, 0), vec(0, 6000), vec(5000, 6000), vec(5000, 3000), vec(9000, 3000), vec(9000, 0)];
const SLAB = [
  vec(-300, -300),
  vec(-300, 6300),
  vec(5300, 6300),
  vec(5300, 3300),
  vec(9300, 3300),
  vec(9300, -300),
];

export const PRIORITY_SCENES: readonly Sample[] = [
  {
    key: 'priority-spojovani',
    title: 'Priority spojování vrstev – tabulka úrovní',
    kind: 'scena',
    date: '2026-11-28',
    description:
      'Dům tvaru L se zateplenými obvodovými stěnami; ve vnitřním rohu na ně navazuje nezateplená zeď ' +
      '(přístavek), příčka do T a strop s Řezem A. Zkus: Nastavení (horní lišta) → Priority spojování. ' +
      'Úrovně jsou shora dolů, výš projede níž. Šipkou ↑ (nebo tažením za ⠿) posuň „Tepelná izolace“ nad ' +
      '„Zdivo“ – ve vnitřním rohu (v náhledu i ve výkresu) izolace projede zdí a vpravo se ukáže podezřelé ' +
      'místo; Ctrl+Z vrátí. Materiál přesuneš volbou vedle něj nebo tažením do jiné úrovně. Úroveň jde ' +
      'přejmenovat, přidat dole a smazat (neprázdnou s přesunem). V panelu Materiály je u materiálu volba ' +
      '„Priorita spojování“ (podle kategorie / úroveň).',
    build(c) {
      const walls = c.run('wall.chain', {
        storeyId: c.storeyId,
        typeId: c.type('Obvodová zateplená 465'),
        points: OUTLINE,
        closed: true,
      });
      c.run('wall.setType', { wallIds: [walls[3] ?? ''], typeId: c.type('Zdivo 300') });
      c.line(vec(2500, 0), vec(2500, 6000), { typeId: c.type('Příčka 100') });
      const slab = {
        storeyId: c.storeyId,
        typeId: c.slabType('ŽB strop 250'),
        outline: SLAB,
        topOffset: 3000,
      };
      c.run('slab.create', slab);
      c.run('section.create', { start: vec(1200, -2000), end: vec(1200, 8000) });
    },
  },
];
