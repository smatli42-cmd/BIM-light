import { expect, test } from '@playwright/test';

test('kostra: stránka BIM-light sandbox ukáže prázdné plátno', async ({ page }) => {
  await page.goto('./');
  await expect(page).toHaveTitle('BIM-light sandbox');
  await expect(page.getByRole('heading', { name: 'BIM-light sandbox' })).toBeVisible();
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
