// Prohlížečové testy: Změnit velikost (Ctrl+K) podle vzoru Arditu – okno s měřítkem, pak výchozí bod.
import { expect, test } from '@playwright/test';
import { clickAt, open, room, wallById } from './helpers.ts';

test.beforeEach(async ({ page }) => {
  await open(page);
});

test('koncepce-rozhrani / Ctrl+K: okno Změnit velikost, Pokračovat a klik výchozího bodu zvětší místnost', async ({
  page,
}) => {
  const [left, top] = await room(page);
  await page.keyboard.press('Control+a');
  await page.keyboard.press('Control+k');
  await expect(page.getByTestId('scale-dialog')).toBeVisible();
  await page.getByTestId('scale-percent').fill('150');
  await page.getByTestId('scale-ok').click();
  await expect(page.getByTestId('scale-dialog')).toHaveCount(0);
  await clickAt(page, 0, 0);
  expect((await wallById(page, left)).path.end.y).toBeCloseTo(4500, 3);
  expect((await wallById(page, top)).path.end.x).toBeCloseTo(6000, 3);
  expect(await page.evaluate(() => window.__bim!.tool())).toBe('select');
});

test('koncepce-rozhrani / Ctrl+K: bez výběru se okno neotevře; Zrušit nic nezmění', async ({ page }) => {
  await page.keyboard.press('Control+k');
  await expect(page.getByTestId('scale-dialog')).toHaveCount(0);
  const [left] = await room(page);
  await page.keyboard.press('Control+a');
  await page.keyboard.press('Control+k');
  await page.getByRole('button', { name: 'Zrušit' }).click();
  await expect(page.getByTestId('scale-dialog')).toHaveCount(0);
  expect((await wallById(page, left)).path.end.y).toBeCloseTo(3000, 3);
});
