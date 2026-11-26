// Prohlížečové testy: kontrola modelu a rekonstrukce (plán stěn Z10) – varování v info boxu, výběr
// dotčených stěn, nástroj Vybourat úsek.
import { expect, test } from '@playwright/test';
import { clickAt, model, open, room, selection } from './helpers.ts';

test.beforeEach(async ({ page }) => {
  await open(page);
});

test('plan-steny / Z10: Zkontrolovat podlaží – překryv dvou stěn, klik vybere obě', async ({ page }) => {
  const ids = await page.evaluate(() => {
    const h = window.__bim!;
    const mk = (a: { x: number; y: number }, b: { x: number; y: number }) =>
      h.run('wall.create', {
        storeyId: h.storeyId(),
        typeId: h.typeId('Zdivo 300'),
        path: { kind: 'line', start: a, end: b },
      })[0];
    return [mk({ x: 0, y: 0 }, { x: 4000, y: 0 }), mk({ x: 3000, y: 100 }, { x: 6000, y: 100 })];
  });
  await page.getByTestId('check-run').click();
  await expect(page.getByTestId('check-count')).toHaveText('Varování: 1');
  await page.getByTestId('check-issue').click();
  expect([...(await selection(page)).walls].sort()).toEqual([...ids].sort());
});

test('plan-steny / Z10: nástroj Vybourat úsek – dva kliky na stěnu, prostřední část má stav bourání', async ({
  page,
}) => {
  const [left] = await room(page);
  await page.getByTestId('tool-demolish').click();
  await clickAt(page, -150, 1000);
  await clickAt(page, -150, 2000);
  const walls = Object.values((await model(page)).elements);
  expect(walls).toHaveLength(6);
  expect(walls.filter((w) => w.status === 'demolished')).toHaveLength(1);
  expect(walls.map((w) => w.id)).toContain(left);
});
