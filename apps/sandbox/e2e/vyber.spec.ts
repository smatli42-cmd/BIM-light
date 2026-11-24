import { expect, test } from '@playwright/test';
import { clickAt, dims, dragPx, open, px, room, run, selection, walls } from './helpers.ts';

test.beforeEach(async ({ page }) => {
  await open(page);
});

const linear = (page: import('@playwright/test').Page, a: string, b: string) =>
  page.evaluate(
    ([x, y]) =>
      window.__bim!.run('dimension.create', {
        kind: 'linear',
        refs: [
          { wallId: x, face: 'ref' },
          { wallId: y, face: 'ref' },
        ],
        offset: 0,
        viewId: window.__bim!.viewId(),
      }),
    [a, b] as const,
  );

test.describe('pravidla-interakce / Výběr', () => {
  test('klik vybere jednu stěnu, Shift+klik přidá a ubere, Esc zruší', async ({ page }) => {
    const [left, top] = await room(page);
    await clickAt(page, -150, 1500);
    expect((await selection(page)).walls).toEqual([left]);
    await clickAt(page, 2000, 3150, 'Shift');
    expect((await selection(page)).walls).toEqual([left, top]);
    await clickAt(page, -150, 1500, 'Shift');
    expect((await selection(page)).walls).toEqual([top]);
    await page.keyboard.press('Escape');
    expect((await selection(page)).walls).toEqual([]);
  });

  test('rámeček zleva doprava vybere jen celé stěny', async ({ page }) => {
    const [left] = await room(page);
    await dragPx(page, await px(page, -1000, -1000), await px(page, 1000, 4000));
    expect((await selection(page)).walls).toEqual([left]);
  });

  test('rámeček zprava doleva vybere i protnuté', async ({ page }) => {
    const [left, top, , bottom] = await room(page);
    await dragPx(page, await px(page, 1000, 4000), await px(page, -1000, -1000));
    expect((await selection(page)).walls.sort()).toEqual([left, top, bottom].sort());
  });

  test('Ctrl+A vybere vše, Del smaže vybrané', async ({ page }) => {
    await room(page);
    await clickAt(page, 2000, 1500);
    await page.keyboard.press('Control+a');
    expect((await selection(page)).walls.length).toBe(4);
    await page.keyboard.press('Delete');
    expect((await walls(page)).length).toBe(0);
    await page.keyboard.press('Control+z');
    expect((await walls(page)).length).toBe(4);
  });

  test('Tab střídá překrývající se stěny pod kurzorem', async ({ page }) => {
    const ids = await page.evaluate(() => {
      const h = window.__bim!;
      const p = {
        storeyId: h.storeyId(),
        typeId: h.typeId('Zdivo 300'),
        path: { kind: 'line', start: { x: 0, y: 0 }, end: { x: 3000, y: 0 } },
      };
      return [h.run('wall.create', p)[0], h.run('wall.create', p)[0]];
    });
    await clickAt(page, 1500, 150);
    const first = (await selection(page)).walls[0];
    await page.keyboard.press('Tab');
    const second = (await selection(page)).walls[0];
    expect(new Set([first, second])).toEqual(new Set(ids));
  });

  test('při více vybraných stěnách se dočasné kóty nezobrazují', async ({ page }) => {
    await room(page);
    await clickAt(page, -150, 1500);
    expect((await page.evaluate(() => window.__bim!.temps())).length).toBeGreaterThan(0);
    await clickAt(page, 2000, 3150, 'Shift');
    expect((await page.evaluate(() => window.__bim!.temps())).length).toBe(0);
  });

  test('pravé tlačítko na stěně: nabídka; Vybrat stejný typ', async ({ page }) => {
    await room(page);
    const p = await px(page, -150, 1500);
    await page.mouse.click(p.x, p.y, { button: 'right' });
    await expect(page.getByTestId('context-menu')).toBeVisible();
    await page.getByRole('button', { name: 'Vybrat stejný typ' }).click();
    expect((await selection(page)).walls.length).toBe(4);
  });

  test('filtr výběru podle kategorie: bez kót rámeček vybere jen stěny', async ({ page }) => {
    const [left, , right] = await room(page);
    await linear(page, left, right);
    await page.getByTestId('filter-dims').uncheck();
    await dragPx(page, await px(page, -2000, -2000), await px(page, 6000, 5000));
    const sel = await selection(page);
    expect(sel.walls.length).toBe(4);
    expect(sel.dims.length).toBe(0);
  });
});

test.describe('pravidla-interakce / kóty 12: kóty ve výběru', () => {
  test('rámeček vybere stěny i kóty, Del smaže všechny najednou (jeden krok Undo)', async ({ page }) => {
    const [left, , right] = await room(page);
    await linear(page, left, right);
    await dragPx(page, await px(page, -2000, -2000), await px(page, 6000, 5000));
    const sel = await selection(page);
    expect(sel.dims.length).toBe(1);
    await page.keyboard.press('Delete');
    expect((await dims(page)).length).toBe(0);
    expect((await walls(page)).length).toBe(0);
    await page.keyboard.press('Control+z');
    expect((await dims(page)).length).toBe(1);
  });

  test('Shift+klik na kótu přidá / ubere; jedna kliknutím vybraná kóta se maže samostatně', async ({
    page,
  }) => {
    const [left, , right, bottom] = await room(page);
    const [d1] = await linear(page, left, right);
    await run(page, 'dimension.create', {
      kind: 'length',
      ref: { wallId: bottom, face: 'ref' },
      offset: 800,
      viewId: await page.evaluate(() => window.__bim!.viewId()),
    });
    const ps = await page.evaluate(() => window.__bim!.perms());
    const one = ps.find((p) => p.id === d1)!;
    await page.mouse.click(one.line.x, one.line.y);
    expect((await selection(page)).dims).toEqual([d1]);
    const other = ps.find((p) => p.id !== d1)!;
    await page.keyboard.down('Shift');
    await page.mouse.click(other.line.x, other.line.y);
    await page.keyboard.up('Shift');
    expect((await selection(page)).dims.length).toBe(2);
    await page.mouse.click(one.line.x, one.line.y);
    await page.keyboard.press('Delete');
    expect((await dims(page)).length).toBe(1);
    expect((await walls(page)).length).toBe(4);
  });
});
