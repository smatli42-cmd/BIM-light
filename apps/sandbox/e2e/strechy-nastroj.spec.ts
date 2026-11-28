// Prohlížečové testy nástroje Střecha (rozhodnutí 11, krok S2): ikona v paletě a klávesa H, obdélník dvěma
// kliky (valbová střecha z výchozího nastavení), výběr hrany a přepnutí na štít, úchop bodu obrysu, Ctrl+Z.
import { expect, test, type Page } from '@playwright/test';
import { clickAt, dragPx, open, px } from './helpers.ts';

interface RoofRow {
  id: string;
  planes: number;
  outline: { x: number; y: number }[];
  edges: { kind: string; slope: number }[];
}

const roofs = (page: Page) => page.evaluate(() => window.__bim!.query('roof.list', {})) as Promise<RoofRow[]>;

test.beforeEach(async ({ page }) => {
  await open(page);
});

test('rozhodnutí 11 / S2: nástroj Střecha – obdélník, náhled, hrana na štít, úchop bodu, Ctrl+Z', async ({
  page,
}) => {
  await page.getByTestId('tool-roof').click();
  await expect(page.getByTestId('new-roof-type')).toBeVisible();
  await page.getByTestId('roof-method-rect').click();
  await page.getByTestId('roof-shape-hip').click();
  await page.getByTestId('new-roof-slope').fill('40');
  await page.getByTestId('new-roof-slope').press('Enter');
  await expect(page.getByTestId('new-roof-eave-abs')).toHaveText(/^\+2,58/);
  await clickAt(page, 0, 0);
  // Náhled: spočítaná střecha už před druhým klikem.
  await page.mouse.move(...(Object.values(await px(page, 6000, 3000)) as [number, number]), { steps: 3 });
  expect(await page.evaluate(() => !!window.__bim!.overlay().previewModel)).toBe(true);
  await clickAt(page, 6000, 3000);
  let [r] = await roofs(page);
  expect(r?.planes).toBe(4);
  expect(r?.edges.every((e) => e.kind === 'slope' && e.slope === 40)).toBe(true);
  // Výběr: Esc, klik na hřeben (středová čára střechy) a hrana 2 v info boxu → štít.
  await page.keyboard.press('Escape');
  await clickAt(page, 3000, 1500);
  await expect.poll(() => page.evaluate(() => window.__bim!.selection().roofs)).toEqual([r!.id]);
  await page.getByTestId('roof-edge-1').click();
  await expect(page.getByTestId('roof-active-edge')).toContainText('Hrana 2');
  await page.getByTestId('roof-active-kind').selectOption('gable');
  await expect.poll(async () => (await roofs(page))[0]?.planes).toBe(3);
  // Úchop bodu obrysu: roh 0, 0 → −1000, −1000 (příkaz roof.moveVertex).
  await dragPx(page, await px(page, 0, 0), await px(page, -1000, -1000));
  const near = (q: { x: number; y: number }) => Math.hypot(q.x + 1000, q.y + 1000) < 50;
  await expect.poll(async () => (await roofs(page))[0]?.outline.some(near)).toBe(true);
  await page.keyboard.press('Control+z');
  [r] = await roofs(page);
  expect(r?.outline.some((q) => q.x === 0 && q.y === 0)).toBe(true);
});
