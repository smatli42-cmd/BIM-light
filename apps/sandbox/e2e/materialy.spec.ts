// Prohlížečové testy: knihovna šraf, panel Materiály a materiál vrstvy (doplněk šraf a materiálů).
import { expect, test } from '@playwright/test';
import { clickAt, model, open, wall } from './helpers.ts';

test.beforeEach(async ({ page }) => {
  await open(page);
});

test.describe('katalog-sraf-materialu / UI', () => {
  test('knihovna šraf ukáže všech 40 šraf v pořadí z arditu', async ({ page }) => {
    await page.getByTestId('tab-hatches').click();
    const items = page.getByTestId('hatch-item');
    await expect(items).toHaveCount(40);
    await expect(items.first()).toContainText('1. bez šrafy');
    await expect(items.last()).toContainText('40. Krytina');
  });

  test('panel Materiály: počet, hledání, rozbalení s Použitím a změna šrafy přes příkaz', async ({
    page,
  }) => {
    await wall(page, { x: 0, y: 0 }, { x: 4000, y: 0 });
    await page.getByTestId('tab-materials').click();
    await expect(page.locator('[data-testid=materials] h2')).toContainText('Materiály · 25'); // 15 základních + 5 úprav povrchů + 5 střech
    await page.getByTestId('material-search').fill('zdivo keram');
    await expect(page.getByTestId('material-row')).toHaveCount(1);
    await page.getByTestId('material-row').click();
    await expect(page.getByTestId('material-usage')).toContainText('1 prvků');
    await page.getByTestId('field-hatchId').selectOption('hatch.zdivo-mrizka');
    const m = await model(page);
    const zdivo = Object.values(m.materials).find((x) => x.name === 'Zdivo keramické');
    expect(zdivo?.hatchId).toBe('hatch.zdivo-mrizka');
  });

  test('vybraná stěna: změna materiálu vrstvy se uloží do typu', async ({ page }) => {
    await wall(page, { x: 0, y: 0 }, { x: 4000, y: 0 });
    await clickAt(page, 2000, 150);
    const m0 = await model(page);
    const beton = Object.values(m0.materials).find((x) => x.name === 'Železobeton')!;
    await page.getByTestId('layer-material-0').selectOption(beton.id);
    const m = await model(page);
    const t = Object.values(m.wallTypes).find((x) => x.name === 'Zdivo 300');
    expect(t?.bands[0]?.layers[0]?.materialId).toBe(beton.id);
  });
});
