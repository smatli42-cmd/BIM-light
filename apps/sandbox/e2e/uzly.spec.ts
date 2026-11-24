// Prohlížečové testy: uzel a hrana vybrané stěny (katalog kreslení, část 5; základ 25).
import { expect, test } from '@playwright/test';
import { clickAt, dragPx, open, px, room, wall, wallById, walls } from './helpers.ts';

test.beforeEach(async ({ page }) => {
  await open(page);
});

test.describe('katalog-kresleni / část 5 a základ 25: uzel a hrana', () => {
  test('[R] tažení uzlu posune uchopený konec, roh jde s ním', async ({ page }) => {
    const [left, top] = await room(page);
    await clickAt(page, -150, 1500);
    const g = (await page.evaluate(() => window.__bim!.grips())).find((x) => x.end === 'end')!;
    await dragPx(page, g.at, await px(page, 0, 3500));
    expect((await wallById(page, left)).path.end.y).toBeCloseTo(3500, 6);
    expect((await wallById(page, left)).path.start.y).toBeCloseTo(0, 6);
    expect((await wallById(page, top)).path.start.y).toBeCloseTo(3500, 6);
    expect(await page.evaluate(() => window.__bim!.lenEnd())).toBe('end');
  });

  test('závada: tažený uzel drží směr a délku po 10 mm (desetinná čísla v kótách)', async ({ page }) => {
    const free = await wall(page, { x: 0, y: 0 }, { x: 0, y: 2000 });
    await clickAt(page, -150, 1000);
    const g = (await page.evaluate(() => window.__bim!.grips())).find((x) => x.end === 'end')!;
    const to = await px(page, 37, 3127);
    await dragPx(page, g.at, to);
    const w = await wallById(page, free);
    expect(w.path.end.x).toBeCloseTo(0, 6);
    expect(w.path.end.y % 10).toBeCloseTo(0, 6);
  });

  test('katalog 5.2: při tažení uzlu se ukazují dočasné kóty a náhled, model se mění až po puštění', async ({
    page,
  }) => {
    const free = await wall(page, { x: 0, y: 0 }, { x: 0, y: 2000 });
    await clickAt(page, -150, 1000);
    const g = (await page.evaluate(() => window.__bim!.grips())).find((x) => x.end === 'end')!;
    const to = await px(page, 0, 3000);
    await page.mouse.move(g.at.x, g.at.y);
    await page.mouse.down();
    await page.mouse.move(to.x, to.y, { steps: 6 });
    const len = (await page.evaluate(() => window.__bim!.temps())).find((t) => t.key === 'len');
    expect(len?.value).toBeCloseTo(3000, 6);
    expect((await wallById(page, free)).path.end.y).toBeCloseTo(2000, 6);
    await page.mouse.up();
    expect((await wallById(page, free)).path.end.y).toBeCloseTo(3000, 6);
  });

  test('[R] 5: tažení líce stěnu odsadí (tloušťka zůstává), navazující se natáhnou', async ({ page }) => {
    const [left, top] = await room(page);
    await clickAt(page, -150, 1500);
    await dragPx(page, await px(page, 0, 1500), await px(page, 400, 1500));
    expect((await wallById(page, left)).path.start.x).toBeCloseTo(400, 6);
    expect((await wallById(page, top)).path.start.x).toBeCloseTo(400, 6);
  });

  test('[R] 5: pravé tlačítko na uzlu – Odpojit roh; na hraně – Přidat bod', async ({ page }) => {
    const [left] = await room(page);
    await clickAt(page, -150, 1500);
    const g = (await page.evaluate(() => window.__bim!.grips())).find((x) => x.end === 'end')!;
    await page.mouse.click(g.at.x, g.at.y, { button: 'right' });
    await page.getByRole('button', { name: 'Odpojit roh' }).click();
    const rel = Object.values((await page.evaluate(() => window.__bim!.model())).relations);
    expect(rel.length).toBe(3);
    await clickAt(page, -150, 1500);
    const e = await px(page, 0, 1000);
    await page.mouse.click(e.x, e.y, { button: 'right' });
    await page.getByRole('button', { name: 'Přidat bod' }).click();
    await clickAt(page, 0, 1000);
    expect((await walls(page)).length).toBe(5);
    expect((await wallById(page, left)).path.end.y).toBeCloseTo(1000, 6);
  });
});
