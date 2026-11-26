import { expect, test } from '@playwright/test';
import { clickAt, model, open, selection, wall } from './helpers.ts';

test.beforeEach(async ({ page }) => {
  await open(page);
});

const view = async (page: Parameters<typeof model>[0]) => {
  const id = await page.evaluate(() => window.__bim!.viewId());
  return (await model(page)).views[id]!;
};

test.describe('koncepce-rozhrani / 2 G: spodní lišta a okna', () => {
  test('dvě okna vedle sebe: klik do druhého ho udělá aktivním, jedno okno je zase sloučí', async ({
    page,
  }) => {
    await page.getByTestId('layout-2').click();
    await expect(page.locator('.window')).toHaveCount(2);
    const passive = page.getByTestId('drawing-canvas-passive');
    const box = (await passive.boundingBox())!;
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await expect(page.getByTestId('window-passive')).toHaveCount(1);
    expect(await page.evaluate(() => window.__bim!.activeWindow())).toBe(1);
    await page.getByTestId('layout-1').click();
    await expect(page.locator('.window')).toHaveCount(1);
  });

  test('kombinace vrstev a grafické přepisy jdou příkazy do pohledu okna', async ({ page }) => {
    await page.getByTestId('combo-menu').click();
    const items = page.getByTestId('combo-menu-menu').getByRole('menuitem');
    await items.nth(1).click();
    expect((await view(page)).local.layerStates).toBeDefined();
    await page.getByTestId('overrides-menu').click();
    await page.getByTestId('overrides-menu-menu').getByRole('menuitem').last().click();
    expect((await view(page)).local.overrideCombinationId ?? (await view(page)).styleId).toBeTruthy();
  });

  test('izolovat popisy: stěnu nejde vybrat; odhalit: skrytou stěnu jde vybrat', async ({ page }) => {
    const id = await wall(page, { x: 0, y: 0 }, { x: 4000, y: 0 });
    await page.getByTestId('isolate-toggle').click();
    await clickAt(page, 2000, 150);
    expect((await selection(page)).walls).toEqual([]);
    await page.getByTestId('isolate-toggle').click();
    // Skrýt vrstvu stěny (rychlé volby: vybrat stěnu → skrýt vrstvy označených).
    await clickAt(page, 2000, 150);
    await page.getByTestId('layers-quick').click();
    await page.getByTestId('layers-hide-selected').click();
    await page.keyboard.press('Escape');
    await clickAt(page, 2000, 150);
    expect((await selection(page)).walls).toEqual([]);
    await page.getByTestId('reveal-toggle').click();
    await clickAt(page, 2000, 150);
    expect((await selection(page)).walls).toEqual([id]);
  });

  test('pera: tloušťka pera v dialogu jde příkazem do tabulky per', async ({ page }) => {
    await page.getByTestId('pens-open').click();
    await expect(page.getByTestId('pens-dialog')).toBeVisible();
    const t = (await model(page)).display.penTable;
    const input = page.getByTestId(`pen-1-${t.scales[0]}`);
    await input.fill('0.2');
    await input.press('Enter');
    expect((await model(page)).display.penTable.pens[0]!.widths[0]).toBeCloseTo(0.2, 6);
  });

  test('trasování a krok přichytávání: volby okna v liště', async ({ page }) => {
    await page.getByTestId('trace-toggle').click();
    await expect(page.getByTestId('trace-toggle')).toHaveAttribute('aria-pressed', 'true');
    await page.getByTestId('step-menu').click();
    await page.getByTestId('step-menu-menu').getByText('100 mm').click();
    await expect(page.getByTestId('step-menu')).toContainText('100 mm');
    await page.getByTestId('snap-toggle').click();
    await expect(page.getByTestId('snap-toggle')).toHaveAttribute('aria-pressed', 'false');
  });

  test('přepnutí sady změní obě okna s pracovním oknem podlaží (ne jen aktivní)', async ({ page }) => {
    await page.getByTestId('tab-contents').click();
    await page.getByTestId('storey-add').click();
    await page.getByTestId('layout-2').click();
    const m0 = await model(page);
    const active = (await view(page)).storeyId;
    const first = Object.values(m0.views).find((v) => !v.saved && v.storeyId !== active)!;
    await page.getByTestId('view-select-passive').selectOption(first.id);
    await page.getByTestId('style-Projekt').click();
    const m = await model(page);
    const projekt = Object.values(m.display.styles).find((st) => st.name === 'Projekt')!.id;
    expect(
      Object.values(m.views)
        .filter((v) => !v.saved)
        .every((v) => v.styleId === projekt),
    ).toBe(true);
  });
});
