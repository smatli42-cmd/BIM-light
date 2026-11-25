import { expect, test } from '@playwright/test';
import { clickAt, model, moveTo, open, wall, walls } from './helpers.ts';

test.beforeEach(async ({ page }) => {
  await open(page);
});

const tool = (page: Parameters<typeof model>[0]) => page.evaluate(() => window.__bim!.tool());

test.describe('koncepce-rozhrani / UI2: paleta a info box', () => {
  test('koncepce-rozhrani / 2 C: dvojklik na nástroj Stěna otevře typy stěn, výběr nastaví typ a zapne nástroj', async ({
    page,
  }) => {
    await page.getByTestId('tool-wall').dblclick();
    const list = page.getByTestId('quick-wall-types');
    await expect(list).toBeVisible();
    await list.getByText('Příčka 100', { exact: true }).click();
    await expect(list).toHaveCount(0);
    expect(await tool(page)).toBe('wall');
    await expect(page.getByTestId('new-type').locator('option:checked')).toHaveText('Příčka 100');
  });

  test('koncepce-rozhrani / 2 D: metoda stěny – jedna stěna skončí po prvním úseku, obdélník je metoda Stěny', async ({
    page,
  }) => {
    await page.getByTestId('tool-wall').click();
    await page.getByTestId('method-single').click();
    await clickAt(page, 0, 0);
    await clickAt(page, 3000, 0);
    await clickAt(page, 3000, 2000);
    await clickAt(page, 5000, 2000);
    expect(await walls(page)).toHaveLength(2);
    await page.getByTestId('method-rect').click();
    expect(await tool(page)).toBe('rect');
    await expect(page.getByTestId('tool-wall')).toHaveAttribute('aria-pressed', 'true');
  });

  test('koncepce-rozhrani / 2 I: řetěz – nabídka úseku po prvním kliku; oblouk bodem a tečný oblouk', async ({
    page,
  }) => {
    await moveTo(page, 3000, 3000);
    await page.keyboard.press('w');
    await expect(page.getByTestId('segment-menu')).toHaveCount(0);
    await clickAt(page, 0, 0);
    await expect(page.getByTestId('segment-menu')).toBeVisible();
    await expect(page.getByTestId('seg-tangent')).toBeDisabled();
    await clickAt(page, 3000, 0);
    await page.getByTestId('seg-arc').click();
    await clickAt(page, 4000, 1000);
    await clickAt(page, 3000, 2000);
    await page.getByTestId('seg-tangent').click();
    // Předchozí oblouk končí směrem doleva; tečný oblouk do (0, 1000) se ohne dolů.
    await clickAt(page, 0, 1000);
    await page.keyboard.press('Escape');
    const ps = (await walls(page)).map((w) => w.path.kind);
    expect(ps).toEqual(['line', 'arc', 'arc']);
    expect(Object.values((await model(page)).relations)).toHaveLength(2);
  });

  test('koncepce-rozhrani / 2 D: vybraná stěna – referenční čára ikonou, záložka Typ ukáže skladbu', async ({
    page,
  }) => {
    const id = await wall(page, { x: 0, y: 0 }, { x: 4000, y: 0 });
    await clickAt(page, 2000, 150);
    await expect(page.getByTestId('infobox-title')).toHaveText('Stěna');
    await page.getByTestId('refline-axis').click();
    expect((await model(page)).elements[id]!.referenceLine).toBe('axis');
    await page.getByTestId('ib-type').click();
    await expect(page.getByTestId('infobox').getByTestId('type-refline')).toBeVisible();
  });
});
