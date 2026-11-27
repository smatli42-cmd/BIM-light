// Prohlížečové testy spárořezu (prvky stavby 9, základ 14): počty dlaždic a úzké řezy v info boxu
// místnosti, posun počátku číslem a tažením křížku v půdorysu.
import { expect, test } from '@playwright/test';
import { clickAt, dragPx, model, open, px, room, selection } from './helpers.ts';

test.beforeEach(async ({ page }) => {
  await open(page);
});

/** Místnost 4000 × 3000 s dlažbou 600×600 na střed, vybraná. */
async function tiledRoom(page: import('@playwright/test').Page) {
  await room(page);
  await page.keyboard.press('n');
  await clickAt(page, 2000, 1500);
  await page.keyboard.press('Escape');
  await clickAt(page, 1000, 1000);
  await expect.poll(async () => (await selection(page)).rooms.length).toBe(1);
  await page.getByTestId('covering-floor').selectOption({ label: 'Dlažba 600×600 šedá' });
}

const origins = async (page: import('@playwright/test').Page) =>
  Object.values((await model(page)).rooms)[0]!.coverings?.tileOrigins;

test.describe('spárořez v sandboxu', () => {
  test('prvky stavby 9: počty dlaždic, úzké řezy a posun počátku číslem', async ({ page }) => {
    await tiledRoom(page);
    await expect(page.getByTestId('tiles-count')).toContainText('Dlažba 600×600 šedá');
    await expect(page.getByTestId('tiles-narrow')).toHaveCount(0);
    const x = page.getByTestId('tiles-origin-floor-x');
    await x.fill('350');
    await x.press('Enter');
    await expect.poll(() => origins(page)).toEqual({ floor: { x: 350, y: 0 } });
    await expect(page.getByTestId('tiles-narrow')).toContainText('Úzké řezy');
  });

  test('základ 14: tažení křížku počátku dlažby v půdorysu uloží posun', async ({ page }) => {
    await tiledRoom(page);
    // Dlažba na střed: počátek je ve středu podlahy (2000, 1500).
    await dragPx(page, await px(page, 2000, 1500), await px(page, 2300, 1500));
    await expect.poll(async () => (await origins(page))?.floor?.x).toBeGreaterThan(200);
    await expect.poll(async () => (await selection(page)).rooms.length).toBe(1);
  });
});
