import { expect, test, type Page } from '@playwright/test';
import { clickAt, open } from './helpers.ts';

test.beforeEach(async ({ page }) => {
  await open(page);
});

const storeyOf = (page: Page, testid: string) =>
  page
    .getByTestId(testid)
    .inputValue()
    .then((v) =>
      page.evaluate((id) => {
        const m = window.__bim!.model();
        return m.storeys[m.views[id]!.storeyId]!.name;
      }, v),
    );

const frame = (page: Page, id: string) =>
  page.getByTestId(id).evaluate((el) => {
    const st = getComputedStyle(el, '::after');
    return [st.borderTopWidth, st.borderRightWidth, st.borderBottomWidth, st.borderLeftWidth];
  });

test.describe('koncepce-rozhrani / 4: 3D v Obsahu, okno, ve kterém se pracuje', () => {
  test('koncepce-rozhrani / 4: 3D z Obsahu nahradí jediné okno půdorysu, podlaží z Obsahu ho vrátí', async ({
    page,
  }) => {
    await page.getByTestId('ct-project').click();
    const storey = page.getByTestId('open-storey-1.NP');
    const item3d = page.getByTestId('open-3d-3D');
    await expect(storey).toHaveClass(/active/);
    await item3d.click();
    await expect(page.getByTestId('window-3d')).toBeVisible();
    await expect(page.getByTestId('window')).toHaveCount(0);
    await expect(item3d).toHaveClass(/active/);
    await expect(storey).not.toHaveClass(/active/);
    await storey.click();
    await expect(page.getByTestId('window-3d')).toHaveCount(0);
    await expect(page.getByTestId('window')).toBeVisible();
    await expect(page.getByTestId('window-passive')).toHaveCount(0);
    await expect(storey).toHaveClass(/active/);
  });

  test('koncepce-rozhrani / 4: dvě okna půdorysu – 3D nahradí aktivní pravé, levé zůstane', async ({
    page,
  }) => {
    await page.getByTestId('layout-2').click();
    await page.getByTestId('drawing-canvas-passive').click({ position: { x: 200, y: 200 } });
    await page.getByTestId('ct-project').click();
    await page.getByTestId('open-3d-3D').click();
    await expect(page.getByTestId('window-3d')).toHaveClass(/active/);
    expect(await frame(page, 'window-3d')).toEqual(['2px', '2px', '2px', '2px']);
    await expect(page.getByTestId('window')).toHaveCount(1);
    await expect(page.getByTestId('window-passive')).toHaveCount(0);
  });

  test('koncepce-rozhrani / 4: pracuji ve 3D vedle půdorysu a kliknu na podlaží – otevře se vpravo místo 3D', async ({
    page,
  }) => {
    await page.evaluate(() =>
      window.__bim!.run('storey.create', { name: '2.NP', elevation: 3000, height: 3000 }),
    );
    await page.keyboard.press('F4');
    await page.getByTestId('canvas-3d').click();
    await expect(page.getByTestId('window-3d')).toHaveClass(/active/);
    await expect(page.getByTestId('window')).not.toHaveClass(/active/);
    await page.getByTestId('ct-project').click();
    await expect(page.getByTestId('open-3d-3D')).toHaveClass(/active/);
    await page.getByTestId('open-storey-2.NP').click();
    await expect(page.getByTestId('window-3d')).toHaveCount(0);
    expect([await storeyOf(page, 'view-select-passive'), await storeyOf(page, 'view-select')]).toEqual([
      '1.NP',
      '2.NP',
    ]);
    await expect(page.getByTestId('window')).toHaveClass(/active/);
    expect(await frame(page, 'window')).toEqual(['2px', '2px', '2px', '2px']);
    await clickAt(page, 2000, 2000);
    await expect(page.getByTestId('open-storey-2.NP')).toHaveClass(/active/);
  });
});
