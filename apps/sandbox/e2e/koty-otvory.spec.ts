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
  expect(refs.every((r) => r.openingId)).toBe(true);
});
