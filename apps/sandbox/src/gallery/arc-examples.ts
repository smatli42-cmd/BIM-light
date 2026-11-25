// Příklady oblouků pro galerii napojení (plán stěn Z5): kruh ze dvou oblouků, roh přímka–oblouk,
// oblouk–oblouk, T na oblouku, kříž přes oblouk a otvor v oblouku.
import { v, type Ctx, type Recipe } from './examples.ts';

const Z = 'Obvodová zateplená 465';

/** Kruh se středem (−r, 0): uzel obou oblouků leží v počátku (detail galerie). */
function ring(c: Ctx, r: number) {
  const a = c.arc(v(0, 0), v(-2 * r, 0), 180, Z);
  c.arc(v(-2 * r, 0), v(0, 0), 180, Z, [
    { end: 'start', wallId: a, at: 'ATEND' },
    { end: 'end', wallId: a, at: 'ATSTART' },
  ]);
  return a;
}

export const ARC_RECIPES: readonly Recipe[] = [
  ['Kruh ze dvou oblouků', 'napojení v přímce, vrstvy soustředně', (c) => void ring(c, 1800)],
  [
    'Kruh s otvorem',
    'otvor vyříznut radiálně, omítky v ostění',
    (c) => {
      const a = ring(c, 1800);
      c.run('opening.create', { wallId: a, offset: 400, width: 900 });
    },
  ],
  [
    'L – přímka × oblouk',
    'stejná skladba, roh po vrstvách',
    (c) => {
      const a = c.wall(v(-2000, 0), v(0, 0), Z);
      c.arc(v(0, 0), v(1800, 1800), -90, Z, [{ end: 'start', wallId: a, at: 'ATEND' }]);
    },
  ],
  [
    'L – oblouk × oblouk',
    'různé poloměry a skladby',
    (c) => {
      const a = c.arc(v(-2000, -1200), v(0, 0), 50, Z);
      c.arc(v(0, 0), v(1800, 1800), 90, 'ŽB stěna 200', [{ end: 'start', wallId: a, at: 'ATEND' }]);
    },
  ],
  [
    'T – příčka na oblouku',
    'jádro příčky k jádru oblouku',
    (c) => {
      // Vrchol oblouku leží v počátku; příčka přichází zevnitř.
      const y = -2000 / Math.sqrt(3);
      const h = c.arc(v(-2000, y), v(2000, y), -120, Z);
      c.wall(v(0, -1500), v(0, 0), 'Příčka 100', [{ end: 'end', wallId: h, at: 'ATPATH' }]);
    },
  ],
  [
    'X – přímka přes oblouk',
    'ŽB oblouk projede příčkou',
    (c) => {
      const y = -2000 / Math.sqrt(3);
      const a = c.arc(v(-2000, y), v(2000, y), -120, 'ŽB stěna 200');
      const b = c.wall(v(0, -1500), v(0, 1500), 'Příčka 100');
      c.run('wall.cross', { wallId: a, toWallId: b });
    },
  ],
];
