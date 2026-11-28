// Prohlížečové testy pohledů 1–4 z Obsahu (pokyn uživatele 2026-11-28, Obsah podle Arditu): tlačítko +
// u Pohledů přidá 4 pohledy kolem budovy, klik otevře pohled, ⟳ přepočítá bez duplikátů, dvojklik
// přejmenuje; nástroj Řez s metodou Pohled vytvoří jeden pohled.
import { expect, test, type Page } from '@playwright/test';
import { clickAt } from './helpers.ts';

const elevations = (page: Page) => page.getByTestId('content-elevations').getByRole('button');

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1700, height: 1000 });
  await page.goto('./?ukazka=pohledy');
  await page.waitForFunction(() => !!window.__bim);
  await page.getByTestId('ct-project').click();
});

test('STAV-rezy pohledy 1–4: + v Obsahu přidá pohledy, Pohled 1 se otevře, ⟳ je nezdvojí', async ({
  page,
}) => {
  await expect(elevations(page)).toHaveCount(0);
  await page.getByTestId('elevations-around').click();
  await expect(elevations(page)).toHaveCount(4);
  await expect(elevations(page).first()).toHaveText('1Pohled jižní');
  await page.getByTestId('open-section-Pohled jižní').click();
  await expect(page.getByTestId('section-label')).toHaveText('Pohled · Pohled jižní · 1:100');
  await expect
    .poll(async () => Number(await page.getByTestId('section-canvas').getAttribute('data-primitives')))
    .toBeGreaterThan(10);
  await page.getByTestId('elevations-around').click();
  await expect(elevations(page)).toHaveCount(4);
});

test('STAV-rezy pohledy 1–4: dvojklik v Obsahu přejmenuje pohled, Esc zruší', async ({ page }) => {
  await page.getByTestId('elevations-around').click();
  await page.getByTestId('open-section-Pohled východní').dblclick();
  const input = page.getByTestId('rename-section');
  await input.fill('Pohled od zahrady');
  await input.press('Enter');
  await expect(page.getByTestId('open-section-Pohled od zahrady')).toBeVisible();
  await page.getByTestId('open-section-Pohled od zahrady').dblclick();
  await page.getByTestId('rename-section').fill('Jiný');
  await page.getByTestId('rename-section').press('Escape');
  await expect(page.getByTestId('open-section-Pohled od zahrady')).toBeVisible();
});

test('STAV-rezy pohledy 1–4: nástroj Řez s metodou Pohled vytvoří jeden pohled', async ({ page }) => {
  await page.evaluate(() => window.__bim!.setView(0.04, 200, 450));
  await page.getByTestId('tool-section').click();
  await page.getByTestId('section-method-elevation').click();
  await clickAt(page, 1000, -1500);
  await clickAt(page, 11000, -1500);
  await clickAt(page, 6000, 3000);
  await expect(elevations(page)).toHaveCount(1);
  await expect(elevations(page).first()).toHaveText('1Pohled jižní');
});
