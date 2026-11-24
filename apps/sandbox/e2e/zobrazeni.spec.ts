// Prohlížečové testy kroku 4 (katalog pohledů, „První pískoviště“: testy; jednoduché ovládání).
import { expect, test, type Page } from '@playwright/test';
import { clickAt, dims, model, open, selection, wall } from './helpers.ts';

test.beforeEach(async ({ page }) => {
  await open(page);
});

/** Kóta mezi dvěma rovnoběžnými stěnami nástrojem Kóta (jde do aktivní skupiny pohledu). */
async function dimension(page: Page) {
  await wall(page, { x: 0, y: 0 }, { x: 0, y: 3000 });
  await wall(page, { x: 2000, y: 0 }, { x: 2000, y: 3000 });
  await page.keyboard.press('d');
  await clickAt(page, 0, 1500);
  await clickAt(page, 2000, 1500);
  await clickAt(page, 1000, 3600);
  await page.keyboard.press('Escape');
}

const visibleDims = (page: Page) => page.evaluate(() => window.__bim!.perms().length);

test.describe('katalog-pohledy / krok 4: zobrazení v sandboxu', () => {
  test('přepínač stylu jedním klikem; přepnutí nemění model ani kóty', async ({ page }) => {
    await dimension(page);
    const before = JSON.stringify({ e: (await model(page)).elements, d: await dims(page) });
    await expect(page.getByTestId('style-state')).toHaveText('styl: Studie');
    await page.getByTestId('style-Projekt').click();
    await expect(page.getByTestId('style-state')).toHaveText('styl: Projekt');
    const after = JSON.stringify({ e: (await model(page)).elements, d: await dims(page) });
    expect(after).toBe(before);
  });

  test('kóta vytvořená ve Studii je v Projektu skrytá a po návratu beze změny', async ({ page }) => {
    await dimension(page);
    expect(await visibleDims(page)).toBe(1);
    const d0 = await dims(page);
    await page.getByTestId('style-Projekt').click();
    expect(await visibleDims(page)).toBe(0);
    await page.getByTestId('style-Studie').click();
    expect(await visibleDims(page)).toBe(1);
    expect(await dims(page)).toEqual(d0);
  });

  test('panel Vrstvy: oko skryje stěny, styl je „upraveno“, Vrátit úpravy zruší', async ({ page }) => {
    await wall(page, { x: 0, y: 0 }, { x: 4000, y: 0 });
    await page.getByTestId('tab-layers').click();
    await page.getByTestId('layer-Stěny a sloupy').getByTestId('layer-eye').click();
    await expect(page.getByTestId('style-state')).toHaveText('styl: Studie (upraveno)');
    await clickAt(page, 2000, 150);
    expect((await selection(page)).walls).toEqual([]);
    await page.getByTestId('style-reset').click();
    await expect(page.getByTestId('style-state')).toHaveText('styl: Studie');
  });

  test('zamčená vrstva nejde vybrat', async ({ page }) => {
    await wall(page, { x: 0, y: 0 }, { x: 4000, y: 0 });
    await page.getByTestId('tab-layers').click();
    await page.getByTestId('layer-Stěny a sloupy').getByTestId('layer-lock').click();
    await clickAt(page, 2000, 150);
    expect((await selection(page)).walls).toEqual([]);
  });

  test('Uložit jako styl: nový styl v přepínači, pohled ho používá a není „upraveno“', async ({ page }) => {
    await page.getByTestId('tab-layers').click();
    await page.getByTestId('layer-Stěny a sloupy').getByTestId('layer-lock').click();
    await page.getByTestId('save-style-name').fill('Studie zamčená');
    await page.getByTestId('save-style').click();
    await expect(page.getByTestId('style-Studie zamčená')).toBeVisible();
    await expect(page.getByTestId('style-state')).toHaveText('styl: Studie zamčená');
  });

  test('nový pohled: podlaží + styl + měřítko (výchozí ze stylu), přepne se na něj', async ({ page }) => {
    await page.getByTestId('new-view-open').click();
    await page.getByTestId('new-view-style').selectOption({ label: 'Projekt' });
    await expect(page.getByTestId('new-view-scale')).toHaveValue('50');
    await page.getByTestId('new-view-create').click();
    await expect(page.getByTestId('style-state')).toHaveText('styl: Projekt');
    await expect(page.getByTestId('view-select').locator('option')).toHaveCount(2);
    await expect(page.getByTestId('view-scale')).toHaveValue('50');
  });

  test('změna měřítka a aktivní skupina anotací: nová kóta jde do zvolené skupiny', async ({ page }) => {
    await page.getByTestId('view-scale').selectOption('200');
    const m = await model(page);
    expect(Object.values(m.views)[0]?.scale).toBe(200);
    const dsp = Object.values(m.display.layers).find((l) => l.name === 'Kóty a popisky – DSP a PPS')!;
    await page.getByTestId('annotation-group').selectOption(dsp.id);
    await dimension(page);
    expect((await dims(page))[0]?.annotationLayerId).toBe(dsp.id);
  });
});
