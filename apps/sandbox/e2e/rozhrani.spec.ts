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
    await expect(page.getByTestId('infobox').getByTestId('ib-thickness')).toHaveText('300 mm');
    await expect(page.getByTestId('infobox').getByTestId('open-type-editor')).toBeVisible();
  });

  test('koncepce-rozhrani / 2 D: dvojitá šipka u vybrané stěny ji převrátí; ref. čára vně = protilehlý líc', async ({
    page,
  }) => {
    const id = await wall(page, { x: 0, y: 0 }, { x: 4000, y: 0 });
    await clickAt(page, 2000, 150);
    const g = (await page.evaluate(() => window.__bim!.grips())).find((x) => x.end === 'flip')!;
    await page.mouse.click(g.at.x, g.at.y);
    expect((await model(page)).elements[id]!.side).toBe('right');
    await page.getByTestId('refline-opp-face').click();
    const w = (await model(page)).elements[id]!;
    expect(w.referenceLine).toBe('opp-face');
    // Stěna zůstala na místě: referenční čára se přesunula na protilehlý líc (y = −300).
    expect(w.path.start.y).toBeCloseTo(-300, 6);
  });
});

test.describe('pokyn uživatele 2026-11-26: pracovní plocha', () => {
  test('pokyn uživatele 2026-11-26: panely bez mezer, šířka info boxu a Obsahu tažením dělítka, dvojklik vrátí výchozí', async ({
    page,
  }) => {
    const palette = (await page.locator('.palette').boundingBox())!;
    const info = page.getByTestId('infobox');
    expect(Math.abs((await info.boundingBox())!.x - (palette.x + palette.width))).toBeLessThan(1);
    const w0 = Math.round((await info.boundingBox())!.width);
    const split = (await page.getByTestId('splitter-infobox').boundingBox())!;
    const y = split.y + split.height / 2;
    await page.mouse.move(split.x + 2, y);
    await page.mouse.down();
    await page.mouse.move(split.x + 102, y, { steps: 5 });
    await page.mouse.up();
    expect(Math.round((await info.boundingBox())!.width)).toBe(w0 + 100);
    const content = page.getByTestId('panel');
    const c0 = Math.round((await content.boundingBox())!.width);
    const cs = (await page.getByTestId('splitter-content').boundingBox())!;
    await page.mouse.move(cs.x + 2, y);
    await page.mouse.down();
    await page.mouse.move(cs.x - 48, y, { steps: 5 });
    await page.mouse.up();
    expect(Math.round((await content.boundingBox())!.width)).toBe(c0 + 50);
    await page.reload();
    expect(Math.round((await page.getByTestId('infobox').boundingBox())!.width)).toBe(w0 + 100);
    await page.getByTestId('splitter-infobox').dblclick();
    expect(Math.round((await page.getByTestId('infobox').boundingBox())!.width)).toBe(w0);
  });

  test('pokyn uživatele 2026-11-26: volba podrobnosti (hrubá / střední / jemná) není ve spodní liště', async ({
    page,
  }) => {
    await expect(page.getByTestId('bottombar')).toBeVisible();
    await expect(page.getByTestId('detail-menu')).toHaveCount(0);
  });
});

test('pokyn uživatele 2026-11-26: dvě okna – poměr tažením dělítka, dvojklik vrátí půlky', async ({
  page,
}) => {
  await page.getByTestId('layout-2').click();
  const box = (await page.locator('.windows').boundingBox())!;
  const first = page.locator('.window').first();
  const split = (await page.getByTestId('splitter-windows').boundingBox())!;
  const y = split.y + split.height / 2;
  await page.mouse.move(split.x + 2, y);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.3, y, { steps: 5 });
  await page.mouse.up();
  expect(Math.abs((await first.boundingBox())!.width - box.width * 0.3)).toBeLessThan(3);
  await page.getByTestId('splitter-windows').dblclick();
  expect(Math.abs((await first.boundingBox())!.width - box.width * 0.5)).toBeLessThan(3);
});

test('pokyn uživatele 2026-11-26: v úzkém okně se záhlaví neořízne, měřítko zůstane celé uvnitř okna', async ({
  page,
}) => {
  await page.getByTestId('layout-2').click();
  const box = (await page.locator('.windows').boundingBox())!;
  const split = (await page.getByTestId('splitter-windows').boundingBox())!;
  const y = split.y + split.height / 2;
  await page.mouse.move(split.x + 2, y);
  await page.mouse.down();
  await page.mouse.move(box.x, y, { steps: 5 });
  await page.mouse.up();
  const win = (await page.locator('.window').first().boundingBox())!;
  const scale = (await page.locator('.window').first().locator('.window-head select').last().boundingBox())!;
  expect(scale.x + scale.width).toBeLessThanOrEqual(win.x + win.width);
  expect(scale.x).toBeGreaterThanOrEqual(win.x);
});
