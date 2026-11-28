// Testovací scény k posledním krokům a opravám (pokyn uživatele 2026-11-26): v každé je přesně to, co
// se naposledy dělalo, aby se nemuselo pokaždé kreslit znovu. Nová scéna = nová položka nahoře.
import { vec } from '../geometry/index.ts';
import type { Sample } from './types.ts';
import { rect, tiledFloor } from './scene-helpers.ts';
import { DIMENSION_SCENES } from './scenes-koty.ts';
import { SLAB_SCENES } from './scenes-desky.ts';
import { ROOM_SCENES } from './scenes-mistnosti.ts';
import { VIEW3D_SCENES } from './scenes-3d.ts';
import { HOUSE } from './house.ts';
import { ELECTRO_SCENES } from './scenes-elektro.ts';

export const SCENES: readonly Sample[] = [
  {
    key: 'popis-skladeb',
    title: 'Popis skladby v řezu',
    kind: 'scena',
    date: '2026-11-28',
    description:
      'Ukázkový dům, Řez A (Obsah → Projekt → Řezy → Řez A) má tři popisy skladby: obvodová stěna 1.NP (S3), ' +
      'strop nad 1.NP (D1) a podlaha (P1, číslované vrstvy). Odkazová čára protne konstrukci kolmo, lomí se, ' +
      'na konci číslo konstrukce v kolečku a pod ním vrstvy typu „Materiál tl. 20 mm“. Zkus: nástroj Popis ' +
      'skladby v paletě (vedle Výškové kóty) → v okně řezu klik do řezané stěny nebo desky, další kliky = ' +
      'lomy čáry (první vždy kolmo), dvojklik / Enter dokončí, Esc ubere bod. Klik na popis ho vybere, tažení ' +
      'kolečka ho posune, Del smaže. V info boxu: kolečko, název typu, tloušťky, číslování, obrácené pořadí, ' +
      'strana řádků, zámek. Změň skladbu (Editor typů) – popis se hned přepíše.',
    build(c) {
      HOUSE.build(c);
    },
  },
  {
    key: 'rezy-uchopy',
    title: 'Úchopy v řezu – výška stěny, poloha stropu, parapet okna',
    kind: 'scena',
    date: '2026-11-28',
    description:
      'Místnost 6 × 4 m s oknem a stropem nad 1.NP, Řez A napříč oknem. Zkus: Obsah → Projekt → Řezy → Řez A, ' +
      'klikni na stěnu s oknem – na horní a spodní hraně se ukážou modré trojúhelníky (úchopy). Táhni horní ' +
      'úchop: vršek se přichytí k úrovni podlaží a hranám stropu, tracker ukazuje výšku; napiš číslo a Enter, ' +
      'Esc zruší, Ctrl+Z vrátí. Vyber okno: spodní úchop mění parapet (nadpraží stojí), horní výšku okna. ' +
      'Vyber strop: tažení ho posune celý (tloušťka je podle typu). Klik na úchop a druhý klik = bez držení.',
    build(c) {
      const t = { typeId: c.type('Zdivo 300') };
      const bottom = c.line(vec(0, 0), vec(6000, 0), t);
      c.line(vec(6000, 0), vec(6000, 4000), t);
      c.line(vec(6000, 4000), vec(0, 4000), t);
      c.line(vec(0, 4000), vec(0, 0), t);
      c.run('opening.create', { wallId: bottom, offset: 2400, width: 1200, height: 1500, sill: 900 });
      const rect = { a: vec(-300, -300), b: vec(6300, 4300) };
      const slab = { storeyId: c.storeyId, typeId: c.slabType('ŽB strop 250'), rect, topOffset: 3000 };
      c.run('slab.create', slab);
      c.run('section.create', { start: vec(3000, -2000), end: vec(3000, 6000) });
    },
  },
  ...ELECTRO_SCENES,
  {
    key: 'rezy',
    title: 'Řezy a pohledy z modelu, nástroj Řez',
    kind: 'scena',
    date: '2026-11-27',
    description:
      'Ukázkový dům s řezy A, B a čtyřmi pohledy. V půdorysu je značka řezu (tlusté konce, šipky, písmeno). ' +
      'Zkus: Obsah → Projekt → Řezy → Řez A: stěny a desky proříznuté po vrstvách se šrafami, za rovinou ' +
      'tenké pohledové hrany, úrovně podlaží s výškovými kótami. Kolečko přibližuje, tažení posouvá. ' +
      'Pohledy → Pohled jižní (fasáda). Řez C je zalomený se stylem „6 m, vzdálená oblast od 3 m“ (vzdálené ' +
      'prvky tence šedě). Nástroj Řez v paletě: klik začátek, konec, klik na stranu pohledu; v info boxu ' +
      'styl, vrstva, rovný / zalomený, hloubka, vzdálená oblast. Výběr: klik na čáru řezu, úchyty na koncích, ' +
      'tažení čáry posune, dvojklik otevře řez, Del smaže. V Řezu A jsou výškové kóty podle ČSN 01 3420; ' +
      'nástroj Výšková kóta v paletě: v okně řezu klik na hranu nebo úroveň, druhý klik umístí praporek. ' +
      'V půdorysu 1.NP: výšková kóta podlahy v rámečku a kóta terénu RT / UT u nároží (týž nástroj v půdorysu).',
    build(c) {
      HOUSE.build(c);
    },
  },
  {
    key: 'typy-desek',
    title: 'Editor typů – typy desek (nosné desky a podlahy)',
    kind: 'scena',
    date: '2026-11-27',
    description:
      'Místnost 6 × 4 m se stropem „ŽB strop 200“ a podlahou „Podlaha dlažba 160“ – oba typy vznikly ' +
      'duplikováním v editoru typů (vlastní skladba). Zkus: levý panel → Editor typů → záložka Desky; ' +
      'seznam je rozdělený na Nosné desky a Podlahy. Vyber typ, změň tloušťku vrstvy, přidej vrstvu navrch, ' +
      'přesuň ji šipkou, klikni na vrstvu v náhledu řezu. Duplikovat, přejmenovat, Smazat (jen nepoužitý). ' +
      'Nebo vyber desku → info box Konstrukce → Upravit v editoru typů.',
    build(c) {
      rect(c, 'Zdivo 300', 6000, 4000);
      const [rc] = c.run('slabType.duplicate', {
        typeId: c.slabType('ŽB strop 250'),
        name: 'ŽB strop 200',
        ownComposition: true,
      });
      c.run('slabType.update', { typeId: rc, mark: 'D3' });
      c.run('slabType.updateLayer', { typeId: rc, layerIndex: 1, thickness: 200 });
      const floor = tiledFloor(c);
      const sid = c.storeyId;
      c.run('slab.create', { storeyId: sid, typeId: rc, rect: { a: vec(-300, -300), b: vec(6300, 4300) } });
      c.run('slab.create', { storeyId: sid, typeId: floor, rect: { a: vec(0, 0), b: vec(6000, 4000) } });
    },
  },
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
