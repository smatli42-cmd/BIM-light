import { expect, test } from '@playwright/test';
import { clickAt, clickPx, model, moveTo, open, px, selection, temps, wall } from './helpers.ts';

test.beforeEach(async ({ page }) => {
  await open(page);
});

const openings = async (page: Parameters<typeof model>[0]) => Object.values((await model(page)).openings);

test.describe('plan-steny / Z4: otvory ve stěně v sandboxu', () => {
  test('plan-steny / Z4: nástroj Otvor vloží otvor klikem na stěnu, Esc vrátí výběr', async ({ page }) => {
    const w = await wall(page, { x: 0, y: 0 }, { x: 6000, y: 0 });
    await moveTo(page, 3000, 3000);
    await page.keyboard.press('o');
    await expect(page.getByTestId('new-opening')).toBeVisible();
    await clickAt(page, 2000, 150);
    const [o] = await openings(page);
    expect(o).toMatchObject({ hostId: w, offset: 1400, width: 1200, height: 1500, sill: 900 });
    await page.keyboard.press('Escape');
  });

  test('plan-steny / Z4: výběr otvoru, posun číslem dočasné kóty a změna šířky v panelu', async ({
    page,
  }) => {
    const w = await wall(page, { x: 0, y: 0 }, { x: 6000, y: 0 });
    await page.evaluate((id) => window.__bim!.run('opening.create', { wallId: id, offset: 1400 }), w);
    await clickAt(page, 2000, 150);
    expect((await selection(page)).openings).toHaveLength(1);
    await expect(page.getByTestId('sel-openings')).toBeVisible();
    const t = await temps(page);
    expect(t.map((x) => Math.round(x.value)).sort((a, b) => a - b)).toEqual([1400, 3400]);
    const left = t.find((x) => Math.round(x.value) === 1400)!;
    await page.mouse.click(left.text.x, left.text.y);
    const input = page.getByTestId('value-edit');
    await input.fill('1000');
    await input.press('Enter');
    expect((await openings(page))[0]!.offset).toBeCloseTo(1000);
    const width = page.getByTestId('sel-openings').getByTestId('field-width');
    await width.fill('900');
    await width.press('Enter');
    await width.blur();
    expect((await openings(page))[0]!.width).toBe(900);
  });

  test('plan-steny / Z4: tažení otvoru po stěně; smazání klávesou Delete stěnu zacelí', async ({ page }) => {
    const w = await wall(page, { x: 0, y: 0 }, { x: 6000, y: 0 });
    await page.evaluate((id) => window.__bim!.run('opening.create', { wallId: id, offset: 1400 }), w);
    const a = await px(page, 2000, 150);
    const b = await px(page, 2500, 150);
    await page.mouse.move(a.x, a.y);
    await page.mouse.down();
    await page.mouse.move(b.x, b.y, { steps: 6 });
    await page.mouse.up();
    expect((await openings(page))[0]!.offset).toBeCloseTo(1900, 0);
    await page.keyboard.press('Delete');
    expect(await openings(page)).toHaveLength(0);
  });

  test('plan-steny / Z4: Okótovat celou stěnu z nabídky stěny vytvoří řetěz a celkovou délku', async ({
    page,
  }) => {
    const w = await wall(page, { x: 0, y: 0 }, { x: 6000, y: 0 });
    await page.evaluate((id) => window.__bim!.run('opening.create', { wallId: id, offset: 1400 }), w);
    await clickPx(page, await px(page, 500, 150), 'right');
    await page.getByText('Okótovat celou stěnu').click();
    const dims = Object.values((await model(page)).dimensions);
    expect(dims).toHaveLength(4);
  });

  test('plan-steny / Z4: rovina řezu v liště pohledu', async ({ page }) => {
    const input = page.getByTestId('cut-plane');
    await input.fill('2500');
    await input.press('Enter');
    await input.blur();
    const m = await model(page);
    expect(Object.values(m.views)[0]!.cutPlane).toBe(2500);
  });
});
