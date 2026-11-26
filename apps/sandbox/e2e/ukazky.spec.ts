// Prohlížečové testy: ukázky (pokyn uživatele 2026-11-26) – otevření z okna Ukázky a odkazem ?ukazka=.
import { expect, test } from '@playwright/test';
import { model } from './helpers.ts';

test('ukázky: odkaz ?ukazka=dum otevře Rodinný dům (dvě podlaží, rekonstrukce)', async ({ page }) => {
  await page.goto('./?ukazka=dum');
  await expect(page.getByTestId('appbar')).toContainText('Rodinný dům – ukázka');
  const m = await model(page);
  expect(Object.keys(m.storeys)).toHaveLength(2);
  expect(Object.keys(m.elements).length).toBeGreaterThan(10);
});

test('ukázky: okno Ukázky – scéna se otevře jedním klikem', async ({ page }) => {
  await page.goto('./');
  await page.getByTestId('samples-open').click();
  await expect(page.getByTestId('samples-dialog')).toBeVisible();
  await page.getByTestId('sample-z10-kontrola').click();
  await expect(page).toHaveURL(/ukazka=z10-kontrola/);
  await expect(page.getByTestId('appbar')).toContainText('Z10 – kontrola modelu');
  expect(Object.keys((await model(page)).elements)).toHaveLength(4);
});
