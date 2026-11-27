// Prohlížečové testy: rozsah 3D okna – podlaží (Filter and Cut Elements in 3D v Archicadu) a ořezový
// kvádr (Section Box v Revitu). Koncepce rozhraní, část 2 E; docs/STAV-3d.md.
import { expect, test, type Page } from '@playwright/test';
import { model } from './helpers.ts';

const storeysIn3d = async (page: Page) => {
  const m = await model(page);
  const ids = await page.evaluate(() => window.__bim3d?.elements() ?? []);
  return new Set(ids.map((id) => m.storeys[(m.elements[id] as { storeyId: string }).storeyId]!.name));
};

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1700, height: 1000 });
  await page.goto('./?ukazka=dum&3d');
  await expect.poll(() => page.evaluate(() => window.__bim3d?.drawn())).toBe(true);
});

test('koncepce-rozhrani / G 10: rozsah podlaží – odškrtnout podlaží, Jen aktivní, Všechna', async ({
  page,
}) => {
  await expect.poll(() => storeysIn3d(page)).toEqual(new Set(['1.NP', '2.NP']));
  await page.getByTestId('view3d-storeys').click();
  await page.getByTestId('view3d-storey-2.NP').click();
  await expect.poll(() => storeysIn3d(page)).toEqual(new Set(['1.NP']));
  // Nabídka zůstává otevřená, poslední podlaží odškrtnout nejde.
  await page.getByTestId('view3d-storey-1.NP').click();
  await expect.poll(() => storeysIn3d(page)).toEqual(new Set(['1.NP']));
  await expect(page.getByTestId('view3d-storeys')).toContainText('1.NP');
  await page.getByTestId('view3d-storeys-all').click();
  await expect.poll(() => storeysIn3d(page)).toEqual(new Set(['1.NP', '2.NP']));
  await page.getByTestId('view3d-storeys').click();
  await page.getByTestId('view3d-storeys-active').click();
  await expect.poll(() => page.evaluate(() => window.__bim3d!.storeys()?.length)).toBe(1);
});

test('koncepce-rozhrani / G 10: ořezový kvádr – zapnout, stáhnout horní stěnu tažením, vypnout', async ({
  page,
}) => {
  await page.getByTestId('view3d-box').click();
  await expect.poll(() => page.evaluate(() => window.__bim3d!.box())).not.toBeNull();
  const top0 = (await page.evaluate(() => window.__bim3d!.box()))!.max.z;
  // Tažení horního úchytu dolů, dokud řez není pod úrovní 2.NP (3000).
  for (let i = 0; i < 8; i++) {
    const h = (await page.evaluate(() => window.__bim3d!.handleOf('z', 'max')))!;
    await page.mouse.move(h.x, h.y);
    await page.mouse.down();
    await page.mouse.move(h.x, h.y + 40, { steps: 5 });
    await page.mouse.up();
    if ((await page.evaluate(() => window.__bim3d!.box()))!.max.z < 2800) break;
  }
  const top1 = (await page.evaluate(() => window.__bim3d!.box()))!.max.z;
  expect(top1).toBeLessThan(Math.min(top0, 2800));
  // Řez pod 2.NP: z 2.NP nic nezůstane.
  await expect.poll(() => storeysIn3d(page)).not.toContain('2.NP');
  await page.getByTestId('view3d-box').click();
  await expect.poll(() => page.evaluate(() => window.__bim3d!.box())).toBeNull();
  await expect.poll(() => storeysIn3d(page)).toEqual(new Set(['1.NP', '2.NP']));
});
