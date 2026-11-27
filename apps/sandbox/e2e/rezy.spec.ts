// Prohlížečové testy řezů a pohledů (rozhodnutí 19; pokyn uživatele 2026-11-27): řez se otevírá jako pohled
// v pracovním okně místo půdorysu (z Obsahu, dvojklikem na značku), podlaží ho vrátí, funguje i ve dvou
// oknech; kresba se přepočítá po změně modelu.
import { expect, test, type Page } from '@playwright/test';
import { model } from './helpers.ts';

const count = async (page: Page, key: 'primitives' | 'hatches', id = 'section-canvas') =>
  Number(await page.getByTestId(id).getAttribute(`data-${key}`));

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1700, height: 1000 });
  await page.goto('./?ukazka=rezy');
  await page.waitForFunction(() => !!window.__bim);
  await page.getByTestId('ct-project').click();
});

test('koncepce-rozhrani / 4: Řez A z Obsahu nahradí půdorys v okně, podlaží z Obsahu ho vrátí', async ({
  page,
}) => {
  const item = page.getByTestId('open-section-Řez A');
  const storey = page.getByTestId('open-storey-1.NP');
  await item.click();
  await expect(page.getByTestId('section-label')).toHaveText('Řez · Řez A · 1:100');
  await expect(page.getByTestId('drawing-canvas')).toHaveCount(0);
  await expect(item).toHaveClass(/active/);
  await expect(storey).not.toHaveClass(/active/);
  await expect.poll(() => count(page, 'hatches')).toBeGreaterThan(10);
  await storey.click();
  await expect(page.getByTestId('drawing-canvas')).toBeVisible();
  await expect(page.getByTestId('section-canvas')).toHaveCount(0);
  await expect(storey).toHaveClass(/active/);
});

test('rozhodnutí 19: měřítko a styl řezu v záhlaví okna; fasáda bez šraf; smazání stěn řez přepočítá', async ({
  page,
}) => {
  await page.getByTestId('open-section-Pohled jižní').click();
  await expect.poll(() => count(page, 'primitives')).toBeGreaterThan(10);
  expect(await count(page, 'hatches')).toBe(0);
  await page.getByTestId('section-select').selectOption({ label: 'Řez A' });
  await page.getByTestId('section-scale').selectOption('50');
  await expect(page.getByTestId('section-label')).toHaveText('Řez · Řez A · 1:50');
  await page.getByTestId('section-style').selectOption({ label: 'Studie' });
  await expect.poll(() => count(page, 'hatches')).toBe(0);
  const before = await count(page, 'primitives');
  const walls = Object.values((await model(page)).elements).filter((e) => e.category === 'wall');
  const ids = walls.map((w) => w.id);
  await page.evaluate((w) => window.__bim!.run('selection.delete', { wallIds: w }), ids);
  await expect.poll(() => count(page, 'primitives')).toBeLessThan(before);
});

test('koncepce-rozhrani / 4: dvě okna – půdorys vlevo, řez vpravo', async ({ page }) => {
  await page.getByTestId('layout-2').click();
  await page.getByTestId('drawing-canvas-passive').click({ position: { x: 200, y: 200 } });
  await page.getByTestId('open-section-Řez B').click();
  await expect(page.getByTestId('section-label')).toHaveText('Řez · Řez B · 1:100');
  await expect(page.getByTestId('drawing-canvas-passive')).toBeVisible();
  await expect(page.getByTestId('window')).toHaveClass(/active/);
  // Klik do půdorysu vlevo: aktivní je půdorys, řez zůstane vpravo jako neaktivní okno.
  await page.getByTestId('drawing-canvas-passive').click({ position: { x: 200, y: 200 } });
  await expect(page.getByTestId('section-canvas-passive')).toBeVisible();
  await expect(page.getByTestId('open-section-Řez B')).not.toHaveClass(/active/);
});
