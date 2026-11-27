// Testovací scény k posledním krokům a opravám (pokyn uživatele 2026-11-26): v každé je přesně to, co
// se naposledy dělalo, aby se nemuselo pokaždé kreslit znovu. Nová scéna = nová položka nahoře.
import { vec } from '../geometry/index.ts';
import type { Sample } from './types.ts';
import { rect } from './scene-helpers.ts';
import { DIMENSION_SCENES } from './scenes-koty.ts';
import { SLAB_SCENES } from './scenes-desky.ts';
import { ROOM_SCENES } from './scenes-mistnosti.ts';
import { VIEW3D_SCENES } from './scenes-3d.ts';

export const SCENES: readonly Sample[] = [
  ...VIEW3D_SCENES,
  ...ROOM_SCENES,
  ...SLAB_SCENES,
  ...DIMENSION_SCENES,
  {
    key: 'z10-vybourani',
    title: 'Z10 – vybouraný úsek a nová stěna',
    kind: 'scena',
    date: '2026-11-26',
    description:
      'Stávající obvodová stěna, prostřední úsek vybouraný (Vybourat úsek) a v mezeře nová stěna. Přepínej ' +
      'filtr rekonstrukce ve spodní liště: Plánovaný stav = stěny napojené bez omítky mezi nimi.',
    build(c) {
      const t = c.type('Obvodová zateplená 465');
      const a = c.line(vec(0, 0), vec(9000, 0), { typeId: t, status: 'existing' });
      c.run('wall.demolishPart', { wallId: a, from: vec(3000, 0), to: vec(6000, 0) });
      c.line(vec(3000, 0), vec(6000, 0), { typeId: t });
      c.run('view.setPhaseFilter', { viewId: c.viewId, filterId: c.phase('Fáze – plánovaný stav') });
    },
  },
  {
    key: 'z10-probourani',
    title: 'Z10 – probourání a zazdívka',
    kind: 'scena',
    date: '2026-11-26',
    description:
      'Stávající místnost: v levé stěně nový otvor (probourání), v horní bouraný otvor (zazdívka). Filtr ' +
      'Srovnávací; zkus i Stávající, Bourací práce (probourání žlutě) a Nový stav (zazdívka červeně).',
    build(c) {
      const [top, , , left] = rect(c, 'Obvodová zateplená 465', 6000, 4000, 'existing');
      c.run('opening.create', {
        wallId: left,
        offset: 1500,
        width: 900,
        height: 2100,
        sill: 0,
        status: 'new',
      });
      c.run('opening.create', {
        wallId: top,
        offset: 2500,
        width: 1200,
        height: 1500,
        sill: 900,
        status: 'demolished',
      });
      c.run('view.setPhaseFilter', { viewId: c.viewId, filterId: c.phase('Fáze – srovnávací') });
    },
  },
  {
    key: 'z10-kontrola',
    title: 'Z10 – kontrola modelu',
    kind: 'scena',
    date: '2026-11-26',
    description:
      'Dvě překrývající se stěny, příčka 6 cm od zdi (nenapojená) a stěna kratší než 10 cm. Nástroj Výběr ' +
      'bez výběru → Kontrola → Zkontrolovat podlaží; klik na varování vybere stěny.',
    build(c) {
      c.line(vec(0, 0), vec(6000, 0), { autoConnect: false });
      c.line(vec(4000, 100), vec(9000, 100), { autoConnect: false, autoCross: false });
      c.line(vec(2000, 3000), vec(2000, 360), { typeId: c.type('Příčka 100'), autoConnect: false });
      c.line(vec(0, 5000), vec(80, 5000), { autoConnect: false });
    },
  },
  {
    key: 'z9-upravy',
    title: 'Z9 – pipeta, výběr stejných, rozdělit s mezerou',
    kind: 'scena',
    date: '2026-11-26',
    description:
      'Místnost se zdivem a třemi příčkami různých typů. Vyber ŽB stěnu → Úpravy → Nasát vlastnosti, vyber ' +
      'příčky → Přenést. Úpravy → Vybrat stejné. Rozdělit s mezerou: Volby příkazu → mezera.',
    build(c) {
      rect(c, 'Zdivo 300', 8000, 5000);
      c.line(vec(2500, 0), vec(2500, 5000), { typeId: c.type('Příčka 125') });
      c.line(vec(5000, 0), vec(5000, 5000), { typeId: c.type('Příčka 100') });
      const rc = c.line(vec(6500, 0), vec(6500, 5000), { typeId: c.type('ŽB stěna 200') });
      c.run('wall.setHeight', {
        wallIds: [rc],
        height: { baseOffset: 0, top: { kind: 'height', value: 2600 } },
      });
    },
  },
  {
    key: 'skladby',
    title: 'Editor typů – společná skladba',
    kind: 'scena',
    date: '2026-11-26',
    description:
      'Typ Nosná zeď 330 sdílí skladbu s typem Zdivo 300. Editor typů → Zdivo 300 → změň tloušťku zdiva: ' +
      'změní se obě stěny. Náhled Půdorys / Řez / 3D, klik na vrstvu.',
    build(c) {
      const shared = c.model.wallTypes[c.type('Zdivo 300')]?.bands[0]?.compositionId ?? '';
      c.run('wallType.setComposition', { typeId: c.type('Nosná zeď 330'), compositionId: shared });
      c.line(vec(0, 0), vec(5000, 0));
      c.line(vec(0, 2000), vec(5000, 2000), { typeId: c.type('Nosná zeď 330') });
    },
  },
  {
    key: 'oblouk-napojeni',
    title: 'Oprava – přímá stěna plynule do oblouku',
    kind: 'scena',
    date: '2026-11-26',
    description:
      'Přímá stěna navazuje pod malým úhlem na oblouk: omítka i izolace se potkají pokosem, bez mezery.',
    build(c) {
      const t = c.type('Obvodová zateplená 465');
      const a = c.line(vec(-5000, 0), vec(0, 0), { typeId: t });
      const path = {
        kind: 'arc',
        start: vec(0, 0),
        end: vec(5000, 1500),
        bulge: Math.tan((-20 * Math.PI) / 180 / 4),
      };
      c.run('wall.create', {
        storeyId: c.storeyId,
        typeId: t,
        path,
        connections: [{ end: 'start', wallId: a, at: 'ATEND' }],
      });
    },
  },
];
