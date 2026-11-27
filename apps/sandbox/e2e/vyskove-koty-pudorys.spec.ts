// Prohlížečové testy výškové kóty v půdorysu (české zvyklosti, Ardit): nástroj Výšková kóta – klik na
// podlahu, druhý klik umístí hodnotu v rámečku; výběr klikem, info box (hodnota, kroužek), tažení, Del.
import { expect, test, type Page } from '@playwright/test';
import { clickAt, dragPx, open, px, run } from './helpers.ts';

const plan = (page: Page) =>
  page.evaluate(() => Object.values(window.__bim!.model().planLevelDims ?? {})) as Promise<
    { marker: string; textAt: { x: number; y: number } }[]
  >;

test.beforeEach(async ({ page }) => {
  await open(page);
  const typeId = await page.evaluate(
    () => Object.values(window.__bim!.model().slabTypes).find((t) => t.slabFunction === 'floor')!.id,
  );
  const storeyId = await page.evaluate(() => window.__bim!.storeyId());
  await run(page, 'slab.create', {
    storeyId,
    typeId,
    rect: { a: { x: 0, y: 0 }, b: { x: 4000, y: 3000 } },
    topOffset: 150,
  });
});

test('Ardit / půdorys: výšková kóta podlahy +0,150 v rámečku, výběr, kroužek, tažení a Del', async ({
  page,
}) => {
  await page.getByTestId('tool-levelDim').click();
  await expect(page.getByTestId('level-marker-default')).toHaveValue('box');
  await clickAt(page, 2000, 1500);
  await clickAt(page, 2000, 1500);
  await expect.poll(async () => (await plan(page)).length).toBe(1);
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
  await clickAt(page, 2000, 1500);
  await expect(page.getByTestId('infobox-title')).toHaveText('Výšková kóta');
  await expect(page.getByTestId('level-value')).toHaveText('+0,150');
  await page.getByTestId('level-marker').selectOption('circle');
  await expect.poll(async () => (await plan(page))[0]?.marker).toBe('circle');
  await dragPx(page, await px(page, 2000, 1500), await px(page, 1000, 1500));
  await expect.poll(async () => Math.round((await plan(page))[0]?.textAt.x ?? 0)).toBeLessThan(1500);
  await page.keyboard.press('Delete');
  await expect.poll(async () => (await plan(page)).length).toBe(0);
});

test('DSP / kóta terénu u nároží: kroužek na rohu stěny s RT a UT z info boxu', async ({ page }) => {
  await page.getByTestId('tool-levelDim').click();
  await page.getByTestId('level-marker-default').selectOption('circle');
  await page.getByTestId('level-default-rt').fill('-200');
  await page.getByTestId('level-default-ut').fill('-150');
  await page.getByTestId('level-default-ut').press('Tab');
  await clickAt(page, 0, 0);
  await clickAt(page, -1500, -800);
  await expect.poll(async () => (await plan(page)).length).toBe(1);
  const d = await page.evaluate(() => Object.values(window.__bim!.model().planLevelDims)[0]);
  expect([d?.marker, d?.rt, d?.ut]).toEqual(['circle', -200, -150]);
});
