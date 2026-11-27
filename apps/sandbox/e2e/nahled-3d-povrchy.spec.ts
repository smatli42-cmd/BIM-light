// Prohlížečové testy: povrchy místností ve 3D (prvky stavby 9) – malby, obklad a dlažba jako tenké plochy
// v barvě z funkce grafiky; jen v režimu Materiály; ořezový kvádr a podlaží je omezí. docs/STAV-3d.md.
import { expect, test, type Page } from '@playwright/test';

const sheets = (page: Page) => page.evaluate(() => window.__bim3d!.scene().sheets);

test('prvky stavby 9: povrchy ve 3D – vidět v Materiálech, ve Skice ne, podlaží a kvádr je omezí', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1700, height: 1000 });
  await page.goto('./?ukazka=3d-povrchy&3d');
  await expect.poll(() => page.evaluate(() => window.__bim3d?.drawn())).toBe(true);
  await expect.poll(() => sheets(page)).toBeGreaterThan(10);
  const all = await sheets(page);
  await page.getByTestId('view3d-mode').selectOption('sketch');
  await expect.poll(() => sheets(page)).toBe(0);
  await page.getByTestId('view3d-mode').selectOption('materials');
  await expect.poll(() => sheets(page)).toBe(all);
  // Jen 2.NP: povrchy místností 1.NP zmizí.
  await page.getByTestId('view3d-storeys').click();
  await page.getByTestId('view3d-storey-1.NP').click();
  await expect.poll(() => sheets(page)).toBeLessThan(all);
  await page.getByTestId('view3d-storeys-all').click();
  // Ořez kolem všeho (s okrajem) žádnou plochu neubere; přesný ořez ploch hlídá surface-sheets.test.ts.
  await expect.poll(() => sheets(page)).toBe(all);
  await page.getByTestId('view3d-box').click();
  await expect.poll(() => page.evaluate(() => window.__bim3d!.box())).not.toBeNull();
  await expect.poll(() => sheets(page)).toBe(all);
});
