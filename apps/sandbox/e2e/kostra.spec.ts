import { expect, test } from '@playwright/test';

test('kostra: stránka BIM-light sandbox ukáže prázdné plátno', async ({ page }) => {
  await page.goto('./');
  await expect(page).toHaveTitle('BIM-light sandbox');
  await expect(page.getByTestId('appbar')).toContainText('BIM-light');
  const canvas = page.getByTestId('drawing-canvas');
  await expect(canvas).toBeVisible();
  const box = await canvas.boundingBox();
  expect(box?.width ?? 0).toBeGreaterThan(100);
  expect(box?.height ?? 0).toBeGreaterThan(100);
});

test('kostra: sandbox načte jádro', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByTestId('core-name')).toHaveText('BIM-light core');
});

test('koncepce-rozhrani / 2: rozložení A–G (lišty, paleta, info box, okno, Obsah, spodní lišta)', async ({
  page,
}) => {
  await page.goto('./');
  for (const id of ['appbar', 'commandbar', 'palette', 'infobox', 'window', 'panel', 'bottombar'])
    await expect(page.getByTestId(id)).toBeVisible();
  await page.getByTestId('panel-close').click();
  await expect(page.getByTestId('panel')).toHaveCount(0);
  await page.getByTestId('tab-types').click();
  await expect(page.getByTestId('panel')).toBeVisible();
});

test('koncepce-rozhrani / 5: světlý motiv výchozí, přepnutí na tmavý se zapamatuje', async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.getByTestId('theme-toggle').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.getByTestId('paper-toggle')).toHaveAttribute('aria-pressed', 'true');
});
