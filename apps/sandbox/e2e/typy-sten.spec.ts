// Prohlížečové testy: panel Typy stěn a editor skladby (plán stěn Z1).
import { expect, test, type Page } from '@playwright/test';
import { clickAt, model, open, wall } from './helpers.ts';

test.beforeEach(async ({ page }) => {
  await open(page);
});

async function openType(page: Page, name: string) {
  await page.getByTestId('tab-types').click();
  await page.getByTestId('type-search').fill(name);
  await page.getByTestId('type-row').first().click();
}

const typeByName = async (page: Page, name: string) =>
  Object.values((await model(page)).wallTypes).find((t) => t.name === name);

test.describe('plán stěn Z1 / panel Typy stěn', () => {
  test('seznam typů z knihovny, hledání a Použití', async ({ page }) => {
    await wall(page, { x: 0, y: 0 }, { x: 4000, y: 0 });
    await page.getByTestId('tab-types').click();
    await expect(page.locator('[data-testid=wall-types] h2')).toContainText('Typy stěn · 8');
    await page.getByTestId('type-search').fill('Zdivo 300');
    await expect(page.getByTestId('type-row')).toHaveCount(1);
    await page.getByTestId('type-row').click();
    await expect(page.getByTestId('type-usage')).toContainText('1 stěn');
    await expect(page.getByTestId('type-preview')).toBeVisible();
  });

  test('editor: přidat vrstvu zvětší tloušťku, smazat ji vrátí; součet se ukáže', async ({ page }) => {
    await openType(page, 'Obvodová');
    await expect(page.getByTestId('type-total')).toContainText('465 mm');
    await page.getByTestId('layer-add').click();
    await expect(page.getByTestId('type-total')).toContainText('475 mm');
    await page.getByTestId('type-layer-3').getByTestId('field-thickness').fill('20');
    await page.getByTestId('type-layer-3').getByTestId('field-thickness').press('Enter');
    await expect(page.getByTestId('type-total')).toContainText('485 mm');
    await page.getByTestId('type-layer-3').getByTestId('layer-remove').click();
    await expect(page.getByTestId('type-total')).toContainText('465 mm');
  });

  test('typ bez jádra: „líc jádra“ je zašedlý', async ({ page }) => {
    await openType(page, 'Obvodová');
    const core = page.getByTestId('type-layer-1');
    await core.getByTestId('field-function').selectOption('insulation');
    await expect(page.locator('[data-testid=type-refline] option[value=core-face]')).toBeDisabled();
  });

  test('duplikovat a smazat použitý typ s náhradou', async ({ page }) => {
    await wall(page, { x: 0, y: 0 }, { x: 4000, y: 0 });
    await openType(page, 'Zdivo 300');
    await page.getByTestId('type-duplicate').click();
    expect(await typeByName(page, 'Zdivo 300 (2)')).toBeTruthy();
    await page.getByTestId('type-delete').click();
    expect(await typeByName(page, 'Zdivo 300')).toBeUndefined();
    const m = await model(page);
    const w = Object.values(m.elements)[0]!;
    expect(m.wallTypes[w.typeId]).toBeTruthy();
  });

  test('vyčistit nepoužité a načíst typ z knihovny zpět', async ({ page }) => {
    await wall(page, { x: 0, y: 0 }, { x: 4000, y: 0 });
    await page.getByTestId('tab-types').click();
    await page.getByTestId('type-purge').click();
    await expect(page.getByTestId('type-row')).toHaveCount(1);
    await page.getByTestId('type-library').selectOption({ label: 'SDK příčka 100' });
    await page.getByTestId('type-load').click();
    expect((await typeByName(page, 'SDK příčka 100'))?.source?.itemId).toBe('drywall-100');
  });

  test('vybraná stěna: změna typu v panelu Vlastnosti', async ({ page }) => {
    await wall(page, { x: 0, y: 0 }, { x: 4000, y: 0 });
    await clickAt(page, 2000, 150);
    const t = await typeByName(page, 'ŽB stěna 200');
    await page.getByTestId('sel-type').selectOption(t!.id);
    const m = await model(page);
    expect(Object.values(m.elements)[0]!.typeId).toBe(t!.id);
  });
});
