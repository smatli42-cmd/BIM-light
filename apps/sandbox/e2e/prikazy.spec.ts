import { expect, test } from '@playwright/test';
import { clickAt, dragPx, moveTo, open, px, room, selection, wall, wallById, walls } from './helpers.ts';

test.beforeEach(async ({ page }) => {
  await open(page);
});

test.describe('pravidla-interakce / Příkazy nad výběrem (základ 25)', () => {
  test('Přesun (M): základní bod, napsaná vzdálenost + Enter; navazující stěny se natáhnou, ostatní stojí', async ({
    page,
  }) => {
    const [left, top, right] = await room(page);
    await clickAt(page, -150, 1500);
    await page.keyboard.press('m');
    await clickAt(page, 0, 0);
    await moveTo(page, 600, 0);
    await page.keyboard.type('500');
    await page.keyboard.press('Enter');
    expect((await wallById(page, left)).path.start.x).toBeCloseTo(500, 6);
    expect((await wallById(page, top)).path.start.x).toBeCloseTo(500, 6);
    expect((await wallById(page, right)).path.start.x).toBeCloseTo(4000, 6);
  });

  test('Kopie (K): klikání na další kopie, Esc končí', async ({ page }) => {
    await wall(page, { x: 0, y: 0 }, { x: 0, y: 3000 });
    await clickAt(page, -150, 1500);
    await page.keyboard.press('k');
    await clickAt(page, 0, 0);
    await clickAt(page, 1000, 0);
    await clickAt(page, 2000, 0);
    await page.keyboard.press('Escape');
    expect((await walls(page)).length).toBe(3);
  });

  test('Otočit (R): střed, napsaný úhel + Enter; volba Kopie otočí kopii', async ({ page }) => {
    const id = await wall(page, { x: 0, y: 0 }, { x: 3000, y: 0 });
    await clickAt(page, 1500, 150);
    await page.keyboard.press('r');
    await clickAt(page, 0, 0);
    await page.keyboard.type('90');
    await page.keyboard.press('Enter');
    const w = await wallById(page, id);
    expect(w.path.end.x).toBeCloseTo(0, 6);
    expect(w.path.end.y).toBeCloseTo(3000, 6);
    await page.getByTestId('opt-copy').check();
    await clickAt(page, -150, 1500);
    await page.keyboard.press('r');
    await clickAt(page, 0, 0);
    await page.keyboard.type('90');
    await page.keyboard.press('Enter');
    expect((await walls(page)).length).toBe(2);
  });

  test('Zrcadlit (F): zrcadlová kopie; Shift+klik původní nahradí', async ({ page }) => {
    await wall(page, { x: 0, y: 0 }, { x: 3000, y: 0 });
    await clickAt(page, 1500, 150);
    await page.keyboard.press('f');
    await clickAt(page, -1000, 2000);
    await clickAt(page, 4000, 2000);
    const ws = await walls(page);
    expect(ws.length).toBe(2);
    expect(ws.some((w) => Math.abs(w.path.start.y - 4000) < 1 && w.side === 'right')).toBe(true);
    await clickAt(page, 1500, 150);
    await page.keyboard.press('f');
    await clickAt(page, 5000, -1000);
    await clickAt(page, 5000, 3000, 'Shift');
    expect((await walls(page)).length).toBe(2);
  });

  test('Pole (P): počet z panelu, rozteč napsaná; radiální pole', async ({ page }) => {
    await wall(page, { x: 0, y: 0 }, { x: 0, y: 3000 });
    await page.getByTestId('opt-array-count').fill('4');
    await clickAt(page, -150, 1500);
    await page.keyboard.press('p');
    await clickAt(page, 0, 0);
    await moveTo(page, 1000, 0);
    await page.keyboard.type('1500');
    await page.keyboard.press('Enter');
    const xs = (await walls(page)).map((w) => Math.round(w.path.start.x)).sort((a, b) => a - b);
    expect(xs).toEqual([0, 1500, 3000, 4500]);
    await page.getByTestId('opt-radial').check();
    await page.getByTestId('opt-array-count').fill('3');
    await clickAt(page, -150, 1500);
    await page.keyboard.press('p');
    await clickAt(page, 0, 0);
    await clickAt(page, 0, 1000);
    await page.keyboard.type('90');
    await page.keyboard.press('Enter');
    expect((await walls(page)).length).toBe(6);
  });

  test('Zarovnat (L): líc druhé stěny se zarovná do přímky s referenčním', async ({ page }) => {
    await wall(page, { x: 0, y: 0 }, { x: 3000, y: 0 });
    const t = await wall(page, { x: 4000, y: 400 }, { x: 7000, y: 400 });
    await page.keyboard.press('l');
    await clickAt(page, 1500, 0);
    await clickAt(page, 5500, 400);
    expect((await wallById(page, t)).path.start.y).toBeCloseTo(0, 6);
  });

  test('Do rohu (T): dvě stěny se spojí v rohu', async ({ page }) => {
    const a = await wall(page, { x: 0, y: 0 }, { x: 3000, y: 0 });
    const b = await wall(page, { x: 4000, y: 600 }, { x: 4000, y: 3000 });
    await page.keyboard.press('t');
    await clickAt(page, 1000, 150);
    await clickAt(page, 3850, 2000);
    expect((await wallById(page, a)).path.end.x).toBeCloseTo(4000, 6);
    expect((await wallById(page, b)).path.start.y).toBeCloseTo(0, 6);
  });

  test('Rozdělit (X): klik na stěnu ji rozdělí na dvě', async ({ page }) => {
    await wall(page, { x: 0, y: 0 }, { x: 3000, y: 0 });
    await page.keyboard.press('x');
    await clickAt(page, 1200, 100);
    expect((await walls(page)).length).toBe(2);
  });

  test('Obdélník (B): šířka, Tab výška, Enter', async ({ page }) => {
    await page.keyboard.press('b');
    await clickAt(page, 0, 0);
    await moveTo(page, 1000, 1000);
    await page.keyboard.type('5000');
    await page.keyboard.press('Tab');
    await page.keyboard.type('4000');
    await page.keyboard.press('Enter');
    const ws = await walls(page);
    expect(ws.length).toBe(4);
    expect(Math.max(...ws.map((w) => w.path.start.x))).toBeCloseTo(5000, 6);
    expect(Math.max(...ws.map((w) => w.path.start.y))).toBeCloseTo(4000, 6);
  });

  test('Undo / Redo (Ctrl+Z, Ctrl+Y) a tlačítka', async ({ page }) => {
    await room(page);
    await page.keyboard.press('Control+z');
    expect((await walls(page)).length).toBe(0);
    await page.keyboard.press('Control+y');
    expect((await walls(page)).length).toBe(4);
    await page.getByTestId('undo').click();
    expect((await walls(page)).length).toBe(0);
    await page.getByTestId('redo').click();
    expect((await walls(page)).length).toBe(4);
  });

  test('Schránka: Ctrl+C, Ctrl+V (klik umístí); Ctrl+D duplikuje', async ({ page }) => {
    await room(page);
    await page.keyboard.press('Control+a');
    await page.keyboard.press('Control+c');
    await page.keyboard.press('Control+v');
    await clickAt(page, 6000, 1500);
    expect((await walls(page)).length).toBe(8);
    expect((await selection(page)).walls.length).toBe(4);
    await page.keyboard.press('Control+d');
    await clickAt(page, 1500, -2000);
    expect((await walls(page)).length).toBe(12);
  });

  test('šipky posouvají výběr o 10 mm, Shift 100, Ctrl 1000', async ({ page }) => {
    const id = await wall(page, { x: 0, y: 0 }, { x: 3000, y: 0 });
    await clickAt(page, 1500, 150);
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('Shift+ArrowUp');
    await page.keyboard.press('Control+ArrowRight');
    const w = await wallById(page, id);
    expect(w.path.start.y).toBeCloseTo(110, 6);
    expect(w.path.start.x).toBeCloseTo(1000, 6);
  });

  test('přesun tažením celého výběru myší', async ({ page }) => {
    const [left, top] = await room(page);
    await clickAt(page, -150, 1500);
    await clickAt(page, 2000, 3150, 'Shift');
    await dragPx(page, await px(page, -150, 1500), await px(page, -150 - 1000, 1500 + 500));
    expect((await wallById(page, left)).path.start.x).toBeCloseTo(-1000, 6);
    expect((await wallById(page, top)).path.start.y).toBeCloseTo(3500, 6);
  });

  test('Z přiblíží na výběr, Home na vše', async ({ page }) => {
    await room(page);
    const s0 = await page.evaluate(() => window.__bim!.scale());
    await clickAt(page, -150, 1500);
    await page.keyboard.press('z');
    const s1 = await page.evaluate(() => window.__bim!.scale());
    expect(s1).toBeGreaterThan(s0);
    await page.keyboard.press('Home');
    expect(await page.evaluate(() => window.__bim!.scale())).toBeLessThan(s1);
  });
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
