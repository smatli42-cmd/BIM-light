// Prohlížečové testy: plovoucí prvky u kurzoru (koncepce rozhraní, část 2 I; screenshoty uživatele
// 2026-11-26) – paleta u uzlu a hrany, karta prvku po podržení myši, tracker s ΔX / ΔY.
import { expect, test } from '@playwright/test';
import { clickAt, moveTo, open, px, room, wall, wallById } from './helpers.ts';

test.beforeEach(async ({ page }) => {
  await open(page);
});

const grip = async (page: Parameters<typeof open>[0]) =>
  (await page.evaluate(() => window.__bim!.grips())).find((x) => x.end === 'end')!;

test.describe('koncepce-rozhrani / 2 I: plovoucí prvky', () => {
  test('koncepce-rozhrani / 2 I: klik na uzel ukáže paletu s během posunu uzlu a tracker Délka; klik uzel posune', async ({
    page,
  }) => {
    const id = await wall(page, { x: 0, y: 0 }, { x: 0, y: 2000 });
    await clickAt(page, -150, 1000);
    const g = await grip(page);
    await page.mouse.click(g.at.x, g.at.y);
    await expect(page.getByTestId('pet')).toBeVisible();
    await expect(page.getByTestId('pet-node-move')).toHaveAttribute('aria-pressed', 'true');
    await moveTo(page, 0, 3000);
    await expect(page.getByTestId('tracker-Délka')).toContainText('3000');
    await expect(page.getByTestId('tracker-ΔY')).toContainText('1000');
    await clickAt(page, 0, 3000);
    expect((await wallById(page, id)).path.end.y).toBeCloseTo(3000, 6);
    await expect(page.getByTestId('pet')).toHaveCount(0);
  });

  test('koncepce-rozhrani / 2 I: tažení uzlu paletu neukáže', async ({ page }) => {
    await wall(page, { x: 0, y: 0 }, { x: 0, y: 2000 });
    await clickAt(page, -150, 1000);
    const g = await grip(page);
    const to = await px(page, 0, 2500);
    await page.mouse.move(g.at.x, g.at.y);
    await page.mouse.down();
    await page.mouse.move(to.x, to.y, { steps: 5 });
    await page.mouse.up();
    await expect(page.getByTestId('pet')).toHaveCount(0);
  });

  test('koncepce-rozhrani / 2 I: paleta u rohu – Odpojit roh je příkaz; dolní řada zapne Přesunout', async ({
    page,
  }) => {
    await room(page);
    await clickAt(page, -150, 1500);
    const g = await grip(page);
    await page.mouse.click(g.at.x, g.at.y);
    await page.getByTestId('pet-disconnect').click();
    expect(Object.values((await page.evaluate(() => window.__bim!.model())).relations).length).toBe(3);
    await expect(page.getByTestId('pet')).toHaveCount(0);
    await page.mouse.click(g.at.x, g.at.y);
    await page.getByTestId('pet-move').click();
    expect(await page.evaluate(() => window.__bim!.tool())).toBe('move');
  });

  test('koncepce-rozhrani / 2 I: klik na líc vybrané stěny ukáže paletu hrany (odsadit, přidat bod, zakřivit)', async ({
    page,
  }) => {
    await wall(page, { x: 0, y: 0 }, { x: 0, y: 2000 });
    await clickAt(page, -150, 1000);
    await clickAt(page, 0, 1000);
    await expect(page.getByTestId('pet-offset')).toHaveAttribute('aria-pressed', 'true');
    await page.getByTestId('pet-curve').click();
    await expect(page.getByTestId('pet-curve')).toHaveAttribute('aria-pressed', 'true');
  });

  test('pokyn uživatele 2026-11-26: karta prvku až po chvíli stání myši; vypínač ve spodní liště ji vypne', async ({
    page,
  }) => {
    await wall(page, { x: 0, y: 0 }, { x: 0, y: 3000 });
    await moveTo(page, -150, 1500);
    await expect(page.getByTestId('hover-card')).toHaveCount(0);
    await expect(page.getByTestId('hover-card')).toBeVisible({ timeout: 3000 });
    await expect(page.getByTestId('hover-card-head')).toContainText('3000 mm');
    await moveTo(page, -2000, 1500);
    await expect(page.getByTestId('hover-card')).toHaveCount(0);
    await page.getByTestId('cards-toggle').click();
    await moveTo(page, -150, 1200);
    await page.waitForTimeout(1500);
    await expect(page.getByTestId('hover-card')).toHaveCount(0);
  });

  test('koncepce-rozhrani / 2 I: tracker při kreslení stěny ukazuje Délku, Úhel, ΔX a ΔY', async ({
    page,
  }) => {
    await page.keyboard.press('w');
    await clickAt(page, 0, 0);
    await moveTo(page, 3000, 0);
    await expect(page.getByTestId('tracker-Délka')).toContainText('3000');
    await expect(page.getByTestId('tracker-ΔX')).toContainText('3000');
    await expect(page.getByTestId('tracker-ΔY')).toContainText('0');
  });
});
