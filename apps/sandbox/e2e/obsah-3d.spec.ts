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
    await clickAt(page, 2000, 2000);
    await expect(page.getByTestId('window')).toHaveClass(/active/);
    await expect(page.getByTestId('window-3d')).not.toHaveClass(/active/);
    await expect(storey).toHaveClass(/active/);
    await expect(item3d).not.toHaveClass(/active/);
    await page.getByTestId('canvas-3d').click();
    await expect(item3d).toHaveClass(/active/);
  });
});
