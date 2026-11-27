// Ukázkový projekt „Rodinný dům – ukázka“ (vymyšlený): co program umí, na jednom místě. 1.NP je
// rekonstrukce stávajícího domu (stávající, bouraná a nová konstrukce, probourání, zazdívka, nika),
// 2.NP nová nástavba; oblouková příčka, otvory, kóty celé stěny a značky typů. Jen příkazy z registru.
import { vec } from '../geometry/index.ts';
import type { Id } from '../ids/index.ts';
import type { Sample, SampleContext } from './types.ts';

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
  c.run('opening.create', { wallId, offset, width, height, sill, ...extra });
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
  opening(c, bearing, 2000, 900, 2100, 0, { status: 'new' });
  opening(c, bearing, 6500, 600, 1200, 900, { ...ex, kind: 'niche', depth: 150, side: 'opp' });
  for (const wallId of [bottom, left])
    c.run('dimension.wholeWall', { wallId, viewId: c.viewId, walls: true });
  c.run('wallTag.tagAll', { viewId: c.viewId });
  slabs(c, c.storeyId, 'ŽB základová deska 300', 465);
}

/** Desky podlaží (D1): nosná deska pod obvodovými stěnami (`under` = přesah pod stěny) a podlaha v místnostech. */
function slabs(c: SampleContext, storeyId: Id, structure: string, under: number) {
  const r = (d: number) => ({ a: vec(-d, -d), b: vec(W + d, H + d) });
  c.run('slab.create', { storeyId, typeId: c.slabType(structure), rect: r(under) });
  c.run('slab.create', { storeyId, typeId: c.slabType('Podlaha anhydrit 150'), rect: r(0) });
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
  // Otvor pro schodiště ve stropě nad 1.NP (D3): prořízne strop i podlahu 2.NP.
  c.run('slabOpening.create', { storeyId, rect: { a: vec(4000, 4700), b: vec(6800, 5900) } });
}

export const HOUSE: Sample = {
  key: 'dum',
  title: 'Rodinný dům – ukázka',
  kind: 'projekt',
  date: '2026-11-26',
  description:
    'Vymyšlený rodinný dům: 1.NP rekonstrukce (stávající, bouraná a nová konstrukce, probourání, zazdívka, ' +
    'nika, oblouková příčka), 2.NP nástavba. Desky: základová deska, strop nad 1.NP s otvorem pro schodiště a podlahy. Kóty, ' +
    'značky typů, výkazy; filtr rekonstrukce ve spodní liště.',
  build(c) {
    ground(c);
    upper(c);
  },
};
