// Prohlížečové testy výškových kót v řezu (ČSN 01 3420; Revit Spot Elevation): nástroj Výšková kóta v okně
// řezu – klik na úroveň, druhý klik umístí praporek; výběr klikem, info box s hodnotou, tažení, Del.
import { expect, test, type Page } from '@playwright/test';

/** Bod výkresu řezu (u, z v mm) → px stránky. */
async function at(page: Page, u: number, z: number) {
  const c = page.getByTestId('section-canvas');
  const box = (await c.boundingBox())!;
  const v = JSON.parse((await c.getAttribute('data-view')) ?? '{}') as { s: number; ox: number; oy: number };
  return { x: box.x + v.ox + u * v.s, y: box.y + v.oy - z * v.s };
}

async function click(page: Page, u: number, z: number) {
  const p = await at(page, u, z);
  await page.mouse.move(p.x, p.y, { steps: 2 });
  await page.mouse.down();
  await page.mouse.up();
}

const dims = (page: Page) =>
  page.evaluate(() => Object.values(window.__bim!.model().levelDims ?? {})) as Promise<
    { at: number; below: boolean }[]
  >;

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1700, height: 1000 });
  await page.goto('./?ukazka=rezy');
  await page.waitForFunction(() => !!window.__bim);
  // Ukázka má v Řezu A vlastní výškové kóty; test začíná bez nich.
  await page.evaluate(() => {
    const ids = Object.keys(window.__bim!.model().levelDims ?? {});
    if (ids.length) window.__bim!.run('levelDim.delete', { levelDimIds: ids });
  });
  await page.getByTestId('ct-project').click();
  await page.getByTestId('open-section-Řez A').click();
  await expect(page.getByTestId('section-canvas')).toHaveAttribute('data-view', /"s"/);
});

test('ČSN 01 3420: nástroj Výšková kóta – klik na úroveň 2.NP, druhý klik praporek, hodnota +3,000', async ({
  page,
}) => {
  await page.getByTestId('tool-levelDim').click();
  await expect(page.getByTestId('infobox-title')).toHaveText('Výšková kóta');
  await click(page, 2000, 3000);
  await click(page, 2000, 3500);
  await expect.poll(async () => (await dims(page)).length).toBe(1);
  expect((await dims(page))[0]?.below).toBe(false);
  await page.keyboard.press('Escape');
  await click(page, 2000, 3150);
  await expect(page.getByTestId('infobox-title')).toHaveText('Výšková kóta');
  await expect(page.getByTestId('level-value')).toHaveText('+3,000');
});

test('ČSN 01 3420: výšková kóta jde táhnout, přepnout na absolutní a smazat klávesou Del', async ({
  page,
}) => {
  await page.getByTestId('tool-levelDim').click();
  await click(page, 2000, 3000);
  await click(page, 2000, 3500);
  await page.keyboard.press('Escape');
  const a = await at(page, 2000, 3150);
  const b = await at(page, 4000, 3150);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps: 5 });
  await page.mouse.up();
  await expect.poll(async () => Math.round((await dims(page))[0]?.at ?? 0)).toBeGreaterThan(3500);
  await page.getByTestId('level-absolute').check();
  await expect(page.getByTestId('level-value')).toHaveText(/m n\. m\./);
  // Fokus je v zaškrtávátku (klávesy jdou do pole): klik zpět na kótu ve výkrese, pak Del.
  const x = (await dims(page))[0]?.at ?? 0;
  await click(page, x, 3150);
  await page.keyboard.press('Delete');
  await expect.poll(async () => (await dims(page)).length).toBe(0);
});
