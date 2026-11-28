// Prohlížečové testy automatických pohledů 1–4 (pokyn uživatele 2026-11-28, Obsah podle Arditu): pohledy
// jsou v projektu samy, v Obsahu „1  Jižní“ na jednom řádku, pořadí skupin Podlaží, Řezy, Pohledy, 3D,
// Výkazy; dvojklik přejmenuje, Delete smaže, ⟳ obnoví; nástroj Řez s metodou Pohled přidá další pohled.
import { expect, test, type Page } from '@playwright/test';
import { clickAt, run } from './helpers.ts';

const elevations = (page: Page) => page.getByTestId('content-elevations').getByRole('button');

interface Data {
  sections: Record<string, { mark: string; points: { x: number }[] }>;
  elements: Record<string, { id: string; path?: { start: { x: number }; end: { x: number } } }>;
}
const data = (page: Page) => page.evaluate(() => window.__bim!.model() as unknown) as Promise<Data>;

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1700, height: 1000 });
  await page.goto('./?ukazka=pohledy');
  await page.waitForFunction(() => !!window.__bim);
  await page.getByTestId('ct-project').click();
});

test('STAV-rezy auto pohledy: 4 pohledy jsou samy, jeden řádek „1 Jižní“, Jižní se otevře', async ({
  page,
}) => {
  await expect(elevations(page)).toHaveCount(4);
  await expect(page.getByTestId('elevations-restore')).toHaveCount(0);
  const first = elevations(page).first();
  await expect(first).toHaveText('1Jižní');
  expect((await first.boundingBox())!.height).toBeLessThan(40);
  const name = (await first.locator('.content-name').boundingBox())!;
  const mark = (await first.locator('.content-mark').boundingBox())!;
  expect(name.x - (mark.x + mark.width)).toBeLessThan(20);
  await page.getByTestId('open-section-Jižní').click();
  await expect(page.getByTestId('section-label')).toHaveText('Pohled · Jižní · 1:100');
  await expect
    .poll(async () => Number(await page.getByTestId('section-canvas').getAttribute('data-primitives')))
    .toBeGreaterThan(10);
});

test('koncepce-rozhrani / Obsah: pořadí skupin Podlaží, Řezy, Pohledy, 3D, Výkazy (jako Ardit)', async ({
  page,
}) => {
  const groups = await page.locator('.content-group').allInnerTexts();
  const order = ['Podlaží', 'Řezy', 'Pohledy', '3D', 'Výkazy'].map((g) =>
    groups.findIndex((t) => t.trim() === g),
  );
  expect(order.every((i) => i >= 0)).toBe(true);
  expect([...order].sort((a, b) => a - b)).toEqual(order);
});

test('STAV-rezy auto pohledy: dvojklik přejmenuje (Esc zruší), Delete smaže a ⟳ ho obnoví', async ({
  page,
}) => {
  await page.getByTestId('open-section-Východní').dblclick();
  await page.getByTestId('rename-section').fill('Od zahrady');
  await page.getByTestId('rename-section').press('Enter');
  await page.getByTestId('open-section-Od zahrady').dblclick();
  await page.getByTestId('rename-section').fill('Jiný');
  await page.getByTestId('rename-section').press('Escape');
  await expect(page.getByTestId('open-section-Od zahrady')).toBeVisible();
  await page.getByTestId('open-section-Severní').focus();
  await page.keyboard.press('Delete');
  await expect(elevations(page)).toHaveCount(3);
  await page.getByTestId('elevations-restore').click();
  await expect(elevations(page)).toHaveCount(4);
  await expect(page.getByTestId('open-section-Severní')).toBeVisible();
  await expect(page.getByTestId('elevations-restore')).toHaveCount(0);
});

test('STAV-rezy auto pohledy: posun stěny posune čáru pohledu, pohledů zůstanou 4', async ({ page }) => {
  const east = async () =>
    Object.values((await data(page)).sections).find((s) => s.mark === '2')?.points[0]?.x;
  const before = (await east()) ?? 0;
  const wall = Object.values((await data(page)).elements).find(
    (e) => e.path?.start.x === 12000 && e.path.end.x === 12000,
  );
  await run(page, 'wall.move', { wallIds: [wall?.id], vector: { x: 2000, y: 0 } });
  await expect.poll(async () => (await east()) ?? 0).toBeGreaterThan(before + 1000);
  await expect(elevations(page)).toHaveCount(4);
});

test('STAV-rezy auto pohledy: nástroj Řez s metodou Pohled přidá pohled 5', async ({ page }) => {
  await page.evaluate(() => window.__bim!.setView(0.04, 200, 450));
  await page.getByTestId('tool-section').click();
  await page.getByTestId('section-method-elevation').click();
  await clickAt(page, 1000, -1500);
  await clickAt(page, 11000, -1500);
  await clickAt(page, 6000, 3000);
  await expect(elevations(page)).toHaveCount(5);
  await expect(elevations(page).last()).toHaveText('5Jižní');
});
