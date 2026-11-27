// Prohlížečové testy povrchů místností (prvky stavby 9, základ 14): sekce Povrchy v info boxu místnosti
// (zóny stěn, podlaha, strop, plochy po typech) a přepis jedné stěny výběrem líce klikem.
import { expect, test } from '@playwright/test';
import { clickAt, model, open, room, selection } from './helpers.ts';

test.beforeEach(async ({ page }) => {
  await open(page);
});

/** Místnost 4000 × 3000 vybraná klikem; vrací [levá, horní, pravá, spodní]. */
async function selectedRoom(page: import('@playwright/test').Page) {
  const walls = await room(page);
  await page.keyboard.press('n');
  await clickAt(page, 2000, 1500);
  await page.keyboard.press('Escape');
  await clickAt(page, 2000, 1500);
  await expect.poll(async () => (await selection(page)).rooms.length).toBe(1);
  return walls;
}

const coverings = async (page: import('@playwright/test').Page) =>
  Object.values((await model(page)).rooms)[0]!.coverings;

test.describe('povrchy místností v sandboxu', () => {
  test('prvky stavby 9: zóny stěn, podlaha a strop z info boxu, plochy po typech', async ({ page }) => {
    await selectedRoom(page);
    await page.getByTestId('covering-zones-type-0').selectOption({ label: 'Malba bílá' });
    await page.getByTestId('covering-zones-add').click();
    await page.getByTestId('covering-zones-type-0').selectOption({ label: 'Obklad 300×600 bílý' });
    await page.getByTestId('covering-floor').selectOption({ label: 'Dlažba 600×600 šedá' });
    await page.getByTestId('covering-ceiling').selectOption({ label: 'Podhled SDK' });
    await expect
      .poll(() => coverings(page))
      .toEqual({
        wallZones: [
          { typeId: 'cov-tiling-300x600', top: 1500 },
          { typeId: 'cov-paint-white', top: null },
        ],
        floor: 'cov-floor-tiles-600',
        ceiling: 'cov-ceiling-sdk',
      });
    // Obvod 14 m × 1,5 m = 21 m² obkladu, podlaha 12 m².
    await expect(page.getByTestId('covering-totals')).toContainText('Obklad 300×600 bílý21,00 m²');
    await expect(page.getByTestId('covering-totals')).toContainText('Dlažba 600×600 šedá12,00 m²');
  });

  test('prvky stavby 9: klik u líce vybere stěnu, vlastní zóny platí jen pro ni', async ({ page }) => {
    const [, top] = await selectedRoom(page);
    await page.getByTestId('covering-zones-type-0').selectOption({ label: 'Malba bílá' });
    await clickAt(page, 2000, 2960);
    await expect.poll(async () => (await selection(page)).face?.wallId).toBe(top);
    await expect(page.getByTestId('covering-face')).toContainText('4,00 m');
    await page.getByTestId('covering-face-own').check();
    await page.getByTestId('covering-face-zones-type-0').selectOption({ label: 'Obklad 300×600 bílý' });
    await expect
      .poll(async () => (await coverings(page))?.wallOverrides)
      .toEqual({ [`${top}:ref`]: [{ typeId: 'cov-tiling-300x600', top: null }] });
    await expect(page.getByTestId('covering-totals')).toContainText('Obklad 300×600 bílý12,00 m²');
    await page.getByTestId('covering-face-own').uncheck();
    await expect.poll(async () => (await coverings(page))?.wallOverrides).toEqual({});
  });
});
