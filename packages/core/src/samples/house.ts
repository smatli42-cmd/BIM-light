// Ukázkový projekt „Rodinný dům – ukázka“ (vymyšlený): co program umí, na jednom místě. 1.NP je
// rekonstrukce stávajícího domu (stávající, bouraná a nová konstrukce, probourání, zazdívka, nika),
// 2.NP nová nástavba; oblouková příčka, otvory, kóty celé stěny a značky typů. Jen příkazy z registru.
import { vec } from '../geometry/index.ts';
import type { Id } from '../ids/index.ts';
import type { Sample, SampleContext } from './types.ts';
import { tiledFloor } from './scene-helpers.ts';

const W = 12000;
const H = 9000;

function opening(
  c: SampleContext,
  wallId: Id,
  offset: number,
  width: number,
  height: number,
  sill: number,
  extra = {},
) {
  return c.run('opening.create', { wallId, offset, width, height, sill, ...extra })[0];
}

/** 1.NP: stávající dům s bouranou příčkou, novými příčkami a probouráním. */
function ground(c: SampleContext) {
  const [top, right, bottom, left] = c.run('wall.rectangle', {
    storeyId: c.storeyId,
    typeId: c.type('Obvodová zateplená 465'),
    a: vec(0, 0),
    b: vec(W, H),
    status: 'existing',
  }) as [Id, Id, Id, Id];
  const existing = { status: 'existing' };
  const bearing = c.line(vec(7000, 0), vec(7000, H), { typeId: c.type('Nosná zeď 330'), ...existing });
  const hall = c.line(vec(0, 5000), vec(7000, 5000), { typeId: c.type('Příčka 125'), ...existing });
  const old = c.line(vec(7000, 4000), vec(W, 4000), { typeId: c.type('Příčka 100'), ...existing });
  c.run('wall.setProperties', { wallIds: [old], status: 'demolished' });
  c.line(vec(7000, 6000), vec(W, 6000), { typeId: c.type('Příčka 100') });
  c.line(vec(3500, 5000), vec(3500, H), { typeId: c.type('SDK příčka 100') });
  const arc = { kind: 'arc', start: vec(1500, 1500), end: vec(4500, 1500), bulge: 0.3 };
  c.run('wall.create', { storeyId: c.storeyId, typeId: c.type('SDK příčka 100'), path: arc });
  const ex = { status: 'existing' };
  opening(c, bottom, 1500, 1500, 1500, 900, ex);
  opening(c, bottom, 8500, 1500, 1500, 900, ex);
  opening(c, top, 2000, 1200, 1500, 900, ex);
  opening(c, right, 1000, 1000, 2100, 0, ex);
  opening(c, left, 2000, 900, 1500, 900, { status: 'demolished' });
  opening(c, hall, 1000, 800, 2000, 0, ex);
  const pass = opening(c, bearing, 2000, 900, 2100, 0, { status: 'new' });
  // Podlaha v novém průchodu celá z jedné strany (ostatní dveře: každá místnost do osy stěny).
  if (pass) c.run('opening.setFloorSplit', { openingIds: [pass], split: 'ref' });
  opening(c, bearing, 6500, 600, 1200, 900, { ...ex, kind: 'niche', depth: 150, side: 'opp' });
  for (const wallId of [bottom, left])
    c.run('dimension.wholeWall', { wallId, viewId: c.viewId, walls: true });
  c.run('wallTag.tagAll', { viewId: c.viewId });
  slabs(c, c.storeyId, 'ŽB základová deska 300', 465);
  // Typ podlahy s dlažbou (editor typů desek) – připravený v projektu pro koupelnu a kuchyni.
  tiledFloor(c);
  rooms(c, c.storeyId, [
    [800, 3500, 'Obývací pokoj'],
    [1700, 7000, 'Pokoj'],
    [5200, 7000, 'Kuchyně'],
    [9500, 2000, 'Ložnice'],
    [9500, 7500, 'Koupelna'],
  ]);
}

/** Místnosti podlaží (prvky stavby 9): bod uvnitř a název; obrys a plocha se spočítají ze stěn. */
function rooms(c: SampleContext, storeyId: Id, list: readonly (readonly [number, number, string])[]) {
  const cat = (n: string) => Object.values(c.model.roomCategories).find((k) => k.name === n)?.id;
  const category: Record<string, string> = {
    Koupelna: 'Hygienické',
    Kuchyně: 'Kuchyně a stravování',
    Šatna: 'Skladové',
  };
  for (const [x, y, name] of list) {
    const [id] = c.run('room.create', { storeyId, point: vec(x, y), name });
    c.run('room.update', { roomId: id, categoryId: cat(category[name] ?? 'Obytné') });
    if (!id) continue;
    coverings(c, id, name);
    // Podlaha patří místnosti: obrys od líce k líci, přepočítá se s posunem stěn (vazba desky).
    c.run('slab.create', { storeyId, typeId: c.slabType('Podlaha anhydrit 150'), roomId: id });
  }
}

/**
 * Povrchy místnosti (prvky stavby 9): koupelna obklad do 1,50 m a dlažba na střed, kuchyně dlažba
 * s počátkem spárořezu posunutým o půl dlaždice (bez úzkých řezů u stěn), pokoje sokl a vinyl.
 */
function coverings(c: SampleContext, roomId: Id, name: string) {
  const wet = name === 'Koupelna';
  const tiled = wet || name === 'Kuchyně';
  const zones = wet
    ? [
        { typeId: 'cov-tiling-300x600', top: 1500 },
        { typeId: 'cov-paint-white', top: null },
      ]
    : [
        { typeId: 'cov-skirting-tiles', top: 80 },
        { typeId: 'cov-paint-white', top: null },
      ];
  c.run('covering.setZones', { roomId, zones });
  const floor = tiled ? 'cov-floor-tiles-600' : 'cov-vinyl-oak';
  c.run('covering.assign', { roomId, place: 'floor', typeId: floor });
  c.run('covering.assign', { roomId, place: 'ceiling', typeId: wet ? 'cov-ceiling-sdk' : 'cov-paint-white' });
  if (name === 'Kuchyně') c.run('covering.setOrigin', { roomId, place: 'floor', offset: { x: 300, y: 0 } });
}

/** Nosná deska podlaží (D1) pod obvodovými stěnami (`under` = přesah); podlahy jsou po místnostech (`rooms`). */
function slabs(c: SampleContext, storeyId: Id, structure: string, under: number) {
  const r = (d: number) => ({ a: vec(-d, -d), b: vec(W + d, H + d) });
  c.run('slab.create', { storeyId, typeId: c.slabType(structure), rect: r(under) });
}

/** 2.NP: nová nástavba (obvodové stěny, příčky, okna). */
function upper(c: SampleContext) {
  const [storeyId] = c.run('storey.create', { name: '2.NP', elevation: 3000, height: 3000 });
  const [top, , bottom] = c.run('wall.rectangle', {
    storeyId,
    typeId: c.type('Obvodová zateplená 465'),
    a: vec(0, 0),
    b: vec(W, H),
  }) as [Id, Id, Id, Id];
  const path = (a: readonly [number, number], b: readonly [number, number]) => ({
    kind: 'line',
    start: vec(...a),
    end: vec(...b),
  });
  for (const [a, b, type] of [
    [[7000, 0], [7000, H], 'Nosná zeď 330'],
    [[0, 4500], [7000, 4500], 'Příčka 125'],
    [[7000, 5000], [W, 5000], 'Příčka 100'],
  ] as const)
    c.run('wall.create', { storeyId, typeId: c.type(type), path: path(a, b), autoConnect: true });
  opening(c, bottom, 2000, 1500, 1500, 900);
  opening(c, bottom, 8500, 1500, 1500, 900);
  opening(c, top, 3000, 2400, 2200, 0);
  if (!storeyId) return;
  slabs(c, storeyId, 'ŽB strop 250', 315);
  rooms(c, storeyId, [
    [3500, 2000, 'Pokoj'],
    [3500, 7000, 'Pracovna'],
    [9500, 2500, 'Ložnice'],
    [9500, 7000, 'Šatna'],
  ]);
  // Otvor pro schodiště ve stropě nad 1.NP (D3): prořízne strop i podlahu 2.NP.
  const [stair] = c.run('slabOpening.create', { storeyId, rect: { a: vec(4000, 4700), b: vec(6800, 5900) } });
  // Přesný odstup schodiště 100 mm od líce stěny pod ním (dočasná kóta, outline.setDistance).
  c.run('outline.setDistance', { elementId: stair, side: 'y-', value: 100 });
  // D4: kóta od hrany otvoru ke stropu k líci nosné zdi.
  const bearing = Object.values(c.model.elements).find(
    (e) => e.category === 'wall' && e.storeyId === storeyId && e.typeId === c.type('Nosná zeď 330'),
  );
  const edge = { outline: 'slabOpening', ownerId: stair, edge: 1 };
  if (bearing)
    c.run('dimension.create', {
      kind: 'linear',
      refs: [edge, { wallId: bearing.id, face: 'ref' }],
      viewId: c.viewId,
      offset: 0,
    });
}

/** D4: nové příčky 1.NP mají vršek ke stropu nad 1.NP (spodní líc stropu 2.NP). */
function attachPartitions(c: SampleContext) {
  const ids = Object.values(c.model.elements)
    .filter((e) => e.category === 'wall' && e.storeyId === c.storeyId && e.status === 'new')
    .map((e) => e.id);
  c.run('wall.attachTop', { wallIds: ids });
}

/** Řezy a pohledy (rozhodnutí 19): Řez A přes okna obou podlaží, Řez B napříč, 4 pohledy kolem domu. */
export function houseSections(c: SampleContext) {
  c.run('section.create', { start: vec(2250, -2500), end: vec(2250, H + 2500), styleId: projectStyle(c) });
  c.run('section.create', { start: vec(-2500, 3000), end: vec(W + 2500, 3000), styleId: projectStyle(c) });
  c.run('elevation.create', {});
}

const projectStyle = (c: SampleContext) =>
  Object.values(c.model.display.styles).find((s) => s.name === 'Projekt')?.id ?? '';

export const HOUSE: Sample = {
  key: 'dum',
  title: 'Rodinný dům – ukázka',
  kind: 'projekt',
  date: '2026-11-26',
  description:
    'Vymyšlený rodinný dům: 1.NP rekonstrukce (stávající, bouraná a nová konstrukce, probourání, zazdívka, ' +
    'nika, oblouková příčka), 2.NP nástavba. Desky: základová deska, strop nad 1.NP s otvorem pro schodiště a podlahy vázané na místnosti; ' +
    'nové příčky 1.NP mají vršek ke stropu, kóta od otvoru ve stropě k nosné zdi, výkaz desek. Kóty, ' +
    'značky typů, výkazy; místnosti s plochou podle ČSN 73 4301, Výpis místností, povrchy (obklad, ' +
    'dlažba, sokl, malba) a Výkaz povrchů; řezy A, B a 4 pohledy (Obsah → Projekt); filtr rekonstrukce ' +
    've spodní liště.',
  build(c) {
    ground(c);
    upper(c);
    attachPartitions(c);
    houseSections(c);
  },
};
