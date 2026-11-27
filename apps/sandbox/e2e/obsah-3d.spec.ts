import { expect, test } from '@playwright/test';
import { clickAt, open } from './helpers.ts';

test.beforeEach(async ({ page }) => {
  await open(page);
});

test.describe('koncepce-rozhrani / 4: 3D v Obsahu a zvýraznění okna, ve kterém se pracuje', () => {
  test('koncepce-rozhrani / 4: klik na 3D pohled v Obsahu otevře 3D okno a zvýrazní ho; klik do půdorysu zpět', async ({
    page,
  }) => {
    await page.getByTestId('ct-project').click();
    const storey = page.getByTestId('open-storey-1.NP');
    const item3d = page.getByTestId('open-3d-3D');
    await expect(storey).toHaveClass(/active/);
    await expect(item3d).not.toHaveClass(/active/);
    await item3d.click();
    await expect(page.getByTestId('window-3d')).toBeVisible();
    await expect(page.getByTestId('window-3d')).toHaveClass(/active/);
    await expect(page.getByTestId('window')).not.toHaveClass(/active/);
    await expect(item3d).toHaveClass(/active/);
    await expect(storey).not.toHaveClass(/active/);
    // Rámeček je vrstva nad obsahem okna (hlavička ani plátno ho nepřekryjí) – na všech čtyřech stranách.
    const frame = (id: string) =>
      page.getByTestId(id).evaluate((el) => {
        const st = getComputedStyle(el, '::after');
        return [st.borderTopWidth, st.borderRightWidth, st.borderBottomWidth, st.borderLeftWidth, st.zIndex];
      });
    expect(await frame('window-3d')).toEqual(['2px', '2px', '2px', '2px', '5']);
    expect((await frame('window'))[0]).toBe('0px');
    await clickAt(page, 2000, 2000);
    await expect(page.getByTestId('window')).toHaveClass(/active/);
    await expect(page.getByTestId('window-3d')).not.toHaveClass(/active/);
    await expect(storey).toHaveClass(/active/);
    await expect(item3d).not.toHaveClass(/active/);
    await page.getByTestId('canvas-3d').click();
    await expect(item3d).toHaveClass(/active/);
  });

  test('koncepce-rozhrani / 4: pracuji ve 3D a kliknu na podlaží – otevře se v pravém okně místo 3D, levé zůstane', async ({
    page,
  }) => {
    await page.evaluate(() =>
      window.__bim!.run('storey.create', { name: '2.NP', elevation: 3000, height: 3000 }),
    );
    await page.getByTestId('ct-project').click();
    await page.getByTestId('open-3d-3D').click();
    await expect(page.getByTestId('window-3d')).toHaveClass(/active/);
    await page.getByTestId('open-storey-2.NP').click();
    await expect(page.getByTestId('window-3d')).toHaveCount(0);
    await expect(page.getByTestId('window-passive')).toHaveCount(1);
    const storeyName = (id: string) =>
      page.evaluate((v) => {
        const m = window.__bim!.model();
        return m.storeys[m.views[v]!.storeyId]!.name;
      }, id);
    const right = await page.getByTestId('view-select').inputValue();
    const left = await page.getByTestId('view-select-passive').inputValue();
    expect([await storeyName(left), await storeyName(right)]).toEqual(['1.NP', '2.NP']);
    await expect(page.getByTestId('window')).toHaveClass(/active/);
    await expect(page.getByTestId('open-storey-2.NP')).toHaveClass(/active/);
  });
});
