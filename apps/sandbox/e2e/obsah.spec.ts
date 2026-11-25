import { expect, test } from '@playwright/test';
import { model, open, selection, wall } from './helpers.ts';

test.beforeEach(async ({ page }) => {
  await open(page);
});

test.describe('koncepce-rozhrani / 4: Obsah, uložené pohledy a sady', () => {
  test('koncepce-rozhrani / 4: Uložit pohled z pracovního okna, přepnutí sady ho nezmění a skryje', async ({
    page,
  }) => {
    await page.getByTestId('ct-views').click();
    await page.getByTestId('view-save').click();
    await expect(page.getByTestId('saved-view')).toHaveCount(1);
    const views = Object.values((await model(page)).views);
    const saved = views.find((v) => v.saved)!;
    expect(saved.name).toBe('Půdorys 1.NP');
    // Přepnutí sady: pracovní okno dostane styl Projekt, uložený pohled (Studie) zůstane a v Obsahu zmizí.
    await page.getByTestId('style-Projekt').click();
    const after = (await model(page)).views;
    expect(after[saved.id]!.styleId).toBe(saved.styleId);
    expect(Object.values(after).find((v) => !v.saved)!.styleId).not.toBe(saved.styleId);
    await expect(page.getByTestId('saved-view')).toHaveCount(0);
    await page.getByTestId('style-Studie').click();
    await expect(page.getByTestId('saved-view')).toHaveCount(1);
  });

  test('koncepce-rozhrani / 4: nastavení pohledu – přejmenovat, měřítko, smazat', async ({ page }) => {
    await page.getByTestId('ct-views').click();
    await page.getByTestId('view-save').click();
    const name = page.getByTestId('vs-name');
    await name.fill('DSP půdorys');
    await name.press('Enter');
    await page.getByTestId('vs-scale').selectOption('50');
    const v = Object.values((await model(page)).views).find((x) => x.saved)!;
    expect([v.name, v.scale]).toEqual(['DSP půdorys', 50]);
    await page.getByTestId('vs-delete').click();
    expect(Object.values((await model(page)).views).filter((x) => x.saved)).toHaveLength(0);
  });

  test('koncepce-rozhrani / 2 B: Najít a vybrat – stěny podle typu přidá do výběru', async ({ page }) => {
    const a = await wall(page, { x: 0, y: 0 }, { x: 4000, y: 0 });
    await wall(page, { x: 0, y: 2000 }, { x: 4000, y: 2000 });
    await page.getByTestId('find-open').click();
    await page.getByTestId('find-cat-wall').click();
    await expect(page.getByTestId('find-count')).toContainText('2');
    await page.getByTestId('find-thickness-min').fill('1000');
    await expect(page.getByTestId('find-count')).toContainText('0');
    await page.getByTestId('find-clear').click();
    await page.getByTestId('find-idContains').fill(a.slice(0, 10));
    await page.getByTestId('find-replace').click();
    expect((await selection(page)).walls).toEqual([a]);
  });
});
