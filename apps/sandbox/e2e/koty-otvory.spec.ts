// Prohlížečové testy: nástroj Kóta a hrany otvorů (hlášení uživatele 2026-11-26) – bouraný otvor i nika.
import { expect, test } from '@playwright/test';
import { clickAt, model, open, wall } from './helpers.ts';

test.beforeEach(async ({ page }) => {
  await open(page);
});

test('hlášení 2026-11-26: nástroj Kóta chytí hrany bouraného otvoru a niky', async ({ page }) => {
  const w = await wall(page, { x: 0, y: 0 }, { x: 6000, y: 0 });
  await page.evaluate((id) => {
    const h = window.__bim!;
    h.run('opening.create', { wallId: id, offset: 1000, width: 900, status: 'demolished' });
    h.run('opening.create', { wallId: id, offset: 4000, width: 600, kind: 'niche', depth: 100 });
  }, w);
  await page.keyboard.press('d');
  await clickAt(page, 1000, 150);
  await clickAt(page, 1900, 150);
  await clickAt(page, 4000, 50);
  await clickAt(page, 4600, 50);
  await clickAt(page, 3000, -1200);
  const dims = Object.values((await model(page)).dimensions);
  expect(dims).toHaveLength(3);
  const refs = dims.flatMap((d) => (d.kind === 'linear' ? d.refs : []));
  expect(refs.every((r) => 'openingId' in r && r.openingId)).toBe(true);
});

test('hlášení 2026-11-26: oblouk – klik na líc a do volna = poloměr, s volbou průměr = průměr', async ({
  page,
}) => {
  await page.evaluate(() => {
    const h = window.__bim!;
    h.run('wall.create', {
      storeyId: h.storeyId(),
      typeId: h.typeId('Zdivo 300'),
      path: { kind: 'arc', start: { x: 5000, y: 0 }, end: { x: -5000, y: 0 }, bulge: 1 },
    });
  });
  await page.keyboard.press('d');
  await clickAt(page, 0, 5000);
  await clickAt(page, 0, 2000);
  await page.getByTestId('arc-dim-diameter').check();
  await clickAt(page, 0, 5000);
  await clickAt(page, -1000, 1000);
  const dims = Object.values((await model(page)).dimensions);
  expect(dims.map((d) => (d.kind === 'length' ? d.measure : d.kind))).toEqual(['radius', 'diameter']);
});

test('pokyn uživatele 2026-11-26: nástroj Kóta v režimu Celou stěnu – klik na stěnu a položení řetězu', async ({
  page,
}) => {
  await page.evaluate(() => {
    const h = window.__bim!;
    h.run('wall.rectangle', {
      storeyId: h.storeyId(),
      typeId: h.typeId('Obvodová zateplená 465'),
      a: { x: 0, y: 0 },
      b: { x: 6000, y: 4000 },
    });
    h.run('wall.create', {
      storeyId: h.storeyId(),
      typeId: h.typeId('Příčka 125'),
      path: { kind: 'line', start: { x: 3000, y: 0 }, end: { x: 3000, y: 4000 } },
      autoConnect: true,
    });
  });
  await page.keyboard.press('d');
  await page.getByTestId('dim-pick-wall').check();
  await expect(page.getByTestId('dim-walls')).toBeChecked();
  await clickAt(page, 1500, -400);
  await clickAt(page, 1500, -1500);
  const dims = Object.values((await model(page)).dimensions);
  // roh 465 – 2875 – příčka 125 – 3000 – roh 465 a celková délka
  expect(dims).toHaveLength(6);
});
