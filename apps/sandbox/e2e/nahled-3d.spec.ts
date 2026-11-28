// Prohlížečové testy: 3D okno vedle půdorysu (koncepce rozhraní, část 2 G, řádek 10; rozhodnutí 14).
import { expect, test, type Page } from '@playwright/test';
import { model, open } from './helpers.ts';

const elements3d = (page: Page) => page.evaluate(() => window.__bim3d?.elements() ?? []);

async function wall(page: Page, x0: number, y0: number, x1: number, y1: number): Promise<string> {
  const [id] = await page.evaluate(
    ([a, b, c, d]) =>
      window.__bim!.run('wall.create', {
        storeyId: window.__bim!.storeyId(),
        typeId: window.__bim!.typeId('Zdivo 300'),
        path: { kind: 'line', start: { x: a, y: b }, end: { x: c, y: d } },
      }),
    [x0, y0, x1, y1] as const,
  );
  return id as string;
}

test('koncepce-rozhrani / G 10: Zobrazit vše ve 3D otevře 3D okno s celým ukázkovým domem', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1700, height: 1000 });
  await page.goto('./?ukazka=dum');
  await expect(page.getByTestId('window-3d')).toHaveCount(0);
  await page.getByTestId('show-3d-all').click();
  await expect(page.getByTestId('window-3d')).toBeVisible();
  await expect(page.getByTestId('window-3d-title')).toHaveText('3D · Celý model');
  await expect.poll(() => page.evaluate(() => window.__bim3d?.drawn())).toBe(true);
  const m = await model(page);
  const ids = await elements3d(page);
  const storeys = new Set(ids.map((id) => (m.elements[id] as { storeyId: string }).storeyId));
  expect(storeys.size).toBe(2);
  // Dům ve 3D má stěny, desky (stropy a podlahy) a střechu (S1) – všechny 3D prvky jsou prvky modelu.
  expect(new Set(ids.map((id) => m.elements[id]?.category))).toEqual(new Set(['wall', 'slab', 'roof']));
  await page.getByTestId('view3d-close').click();
  await expect(page.getByTestId('window-3d')).toHaveCount(0);
});

test('koncepce-rozhrani / G 10: F4 ukáže jen výběr, Shift+F4 zase celý model', async ({ page }) => {
  await open(page);
  const a = await wall(page, 0, 0, 5000, 0);
  await wall(page, 0, 3000, 5000, 3000);
  const p = await page.evaluate(() => window.__bim!.toPage(2500, 0));
  await page.mouse.click(p.x, p.y);
  await expect.poll(() => page.evaluate(() => window.__bim!.selection().walls)).toEqual([a]);
  await page.keyboard.press('F4');
  await expect(page.getByTestId('window-3d-title')).toHaveText('3D · Výběr (1)');
  await expect.poll(() => elements3d(page)).toEqual([a]);
  await page.keyboard.press('Shift+F4');
  await expect(page.getByTestId('window-3d-title')).toHaveText('3D · Celý model');
  await expect.poll(async () => (await elements3d(page)).length).toBe(2);
});

test('koncepce-rozhrani / G 10: klik na stěnu ve 3D ji vybere i v půdorysu', async ({ page }) => {
  await open(page);
  const a = await wall(page, 0, 0, 6000, 0);
  await page.keyboard.press('Shift+F4');
  await expect.poll(() => elements3d(page)).toEqual([a]);
  await expect.poll(() => page.evaluate((id) => window.__bim3d?.pageOf(id), a)).not.toBeNull();
  const at = (await page.evaluate((id) => window.__bim3d!.pageOf(id), a))!;
  await page.mouse.click(at.x, at.y);
  await expect.poll(() => page.evaluate(() => window.__bim!.selection().walls)).toEqual([a]);
  // Klik do prázdna výběr zruší.
  const box = (await page.getByTestId('canvas-3d').boundingBox())!;
  await page.mouse.click(box.x + 10, box.y + box.height - 10);
  await expect.poll(() => page.evaluate(() => window.__bim!.selection().walls)).toEqual([]);
});

test('koncepce-rozhrani / G 10: odkaz ?ukazka=dum&3d otevře dům rovnou s 3D oknem', async ({ page }) => {
  await page.goto('./?ukazka=dum&3d');
  await expect(page.getByTestId('window-3d')).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.__bim3d?.drawn())).toBe(true);
});

test('koncepce-rozhrani / G 10: deska je ve 3D, klik na ni ji vybere v půdorysu a F4 ukáže jen ji', async ({
  page,
}) => {
  await open(page);
  const slab = await page.evaluate(
    () =>
      window.__bim!.run('slab.create', {
        storeyId: window.__bim!.storeyId(),
        typeId: Object.values(window.__bim!.model().slabTypes).find((t) => t.name === 'ŽB strop 250')!.id,
        rect: { a: { x: 0, y: 0 }, b: { x: 6000, y: 4000 } },
      })[0] as string,
  );
  await page.keyboard.press('Shift+F4');
  await expect.poll(() => elements3d(page)).toEqual([slab]);
  await expect.poll(() => page.evaluate((id) => window.__bim3d?.pageOf(id), slab)).not.toBeNull();
  const at = (await page.evaluate((id) => window.__bim3d!.pageOf(id), slab))!;
  await page.mouse.click(at.x, at.y);
  await expect.poll(() => page.evaluate(() => window.__bim!.selection().slabs)).toEqual([slab]);
  await page.keyboard.press('F4');
  await expect(page.getByTestId('window-3d-title')).toHaveText('3D · Výběr (1)');
});
