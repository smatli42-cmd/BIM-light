// Prohlížečové testy: průvodní lekce (vzor Arditu 2026-11-26) – seznam lekcí, modrý rámeček kolem
// popisované části okna, kroky Další / Zpět, cvičný projekt a návrat původního projektu.
import { expect, test } from '@playwright/test';
import { open, walls } from './helpers.ts';

test.beforeEach(async ({ page }) => {
  await open(page);
});

test('průvodce prostředím: lekce Prostředí aplikace orámuje postupně části okna a skončí', async ({
  page,
}) => {
  await page.getByTestId('lessons-open').click();
  await expect(page.getByTestId('lessons-dialog')).toBeVisible();
  await page.getByTestId('lesson-environment').click();
  await expect(page.getByTestId('lessons-dialog')).toHaveCount(0);
  const frame = page.getByTestId('lesson-frame');
  const appbar = (await page.getByTestId('appbar').boundingBox())!;
  expect(Math.abs((await frame.boundingBox())!.y - appbar.y)).toBeLessThan(4);
  await expect(page.getByTestId('lesson-bubble')).toContainText('krok 1 / 8');
  await page.getByTestId('lesson-next').click();
  await expect(page.getByTestId('lesson-bubble')).toContainText('Lišta příkazů');
  for (let i = 0; i < 7; i++) await page.getByTestId('lesson-next').click();
  await expect(page.getByTestId('lesson-bubble')).toHaveCount(0);
  await expect(frame).toHaveCount(0);
});

test('průvodce: lekce Výběr a úpravy běží ve cvičném projektu, po ukončení se vrátí původní projekt', async ({
  page,
}) => {
  expect((await walls(page)).length).toBe(0);
  await page.getByTestId('lessons-open').click();
  await page.getByTestId('lesson-editing').click();
  expect((await walls(page)).length).toBe(4);
  await page.getByTestId('lesson-next').click();
  expect((await page.evaluate(() => window.__bim!.selection())).walls.length).toBe(1);
  await page.getByTestId('lesson-end').click();
  expect((await walls(page)).length).toBe(0);
  await expect(page.getByTestId('lesson-bubble')).toHaveCount(0);
});
