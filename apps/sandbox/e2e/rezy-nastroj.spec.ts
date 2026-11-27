// Prohlížečové testy nástroje Řez (info box podle Arditu): rovný řez třemi kliky (začátek, konec, strana),
// hloubka a styl řezu z info boxu, zalomený řez, výběr značky, úchyt konce, dvojklik a Del.
import { expect, test, type Page } from '@playwright/test';
import { clickAt, dragPx, model, open, px, run } from './helpers.ts';

interface SectionData {
  points: { x: number; y: number }[];
  direction: string;
  depth: number | null;
  presetId: string | null;
}

const sections = async (page: Page) =>
  Object.values(((await model(page)) as unknown as { sections: Record<string, SectionData> }).sections);

test.beforeEach(async ({ page }) => {
  await open(page);
});

test('nástroj Řez: začátek, konec a klik na stranu pohledu vytvoří řez', async ({ page }) => {
  await page.getByTestId('tool-section').click();
  await expect(page.getByTestId('infobox-title')).toHaveText('Řez');
  await page.getByTestId('section-depth').fill('5000');
  await page.getByTestId('section-depth').press('Enter');
  await clickAt(page, 0, 0);
  await clickAt(page, 5000, 0);
  await clickAt(page, 2500, 1000);
  const [sec] = await sections(page);
  expect(sec?.points).toEqual([
    { x: 0, y: 0 },
    { x: 5000, y: 0 },
  ]);
  expect([sec?.direction, sec?.depth]).toEqual(['left', 5000]);
});

test('nástroj Řez: styl řezu z rozbalovače; hloubka je pak jen ke čtení', async ({ page }) => {
  await page.getByTestId('tool-section').click();
  await page.getByTestId('section-preset').selectOption({ label: 'Řez – celá hloubka' });
  await expect(page.getByTestId('section-depth')).toBeDisabled();
  await clickAt(page, 0, 0);
  await clickAt(page, 4000, 0);
  await clickAt(page, 2000, -1000);
  const [sec] = await sections(page);
  expect(sec?.presetId).toBeTruthy();
  expect(sec?.direction).toBe('right');
});

test('nástroj Řez: zalomený řez – úseky kolmo a rovnoběžně, Enter ukončí, klik dá stranu', async ({
  page,
}) => {
  await page.getByTestId('tool-section').click();
  await page.getByTestId('section-method-jogged').click();
  for (const [x, y] of [
    [0, 0],
    [3000, 0],
    [3000, 2000],
    [6000, 2000],
  ] as const)
    await clickAt(page, x, y);
  await page.keyboard.press('Enter');
  await clickAt(page, 1000, 3000);
  const [sec] = await sections(page);
  expect(sec?.points).toHaveLength(4);
  expect(sec?.points[2]).toEqual({ x: 3000, y: 2000 });
});

test('výběr řezu: klik na čáru, úchyt konce prodlouží, dvojklik otevře okno, Del smaže', async ({ page }) => {
  await run(page, 'section.create', { start: { x: 0, y: 0 }, end: { x: 5000, y: 0 } });
  await clickAt(page, 2500, 0);
  await expect(page.getByTestId('infobox-title')).toHaveText('Řez');
  await expect(page.getByTestId('section-name')).toHaveValue('Řez A');
  await dragPx(page, await px(page, 5000, 0), await px(page, 6000, 0));
  await expect.poll(async () => (await sections(page))[0]?.points[1]?.x).toBe(6000);
  await page.getByTestId('section-flip').click();
  await expect.poll(async () => (await sections(page))[0]?.direction).toBe('right');
  await page.mouse.dblclick((await px(page, 2500, 0)).x, (await px(page, 2500, 0)).y);
  await expect(page.getByTestId('section-dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('section-dialog')).toHaveCount(0);
  await clickAt(page, 2500, 0);
  await page.keyboard.press('Delete');
  await expect.poll(async () => (await sections(page)).length).toBe(0);
});
