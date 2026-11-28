// Prohlížečové testy nástroje Střecha, dokončení S2 (pokyn uživatele 2026-11-28): metoda „podle obrysu
// budovy“ (klik do budovy), tvar polovalbová a tažení hrany obrysu za kolečko (roof.moveEdge, jedno Undo).
import { expect, test, type Page } from '@playwright/test';
import { clickAt, dragPx, open, px } from './helpers.ts';

interface RoofRow {
  id: string;
  refOffset: number;
  planes: number;
  outline: { x: number; y: number }[];
  edges: { kind: string; breakHeight?: number }[];
}

const roofs = (page: Page) => page.evaluate(() => window.__bim!.query('roof.list', {})) as Promise<RoofRow[]>;
const box = (pts: { x: number; y: number }[]) => ({
  x0: Math.min(...pts.map((p) => p.x)),
  x1: Math.max(...pts.map((p) => p.x)),
  y0: Math.min(...pts.map((p) => p.y)),
  y1: Math.max(...pts.map((p) => p.y)),
});

test.beforeEach(async ({ page }) => {
  await open(page);
  // Dům: obdélník stěn Zdivo 300 (celé jádro) 6000 × 4000.
  await page.evaluate(() => {
    const h = window.__bim!;
    h.run('wall.rectangle', {
      storeyId: h.storeyId(),
      typeId: h.typeId('Zdivo 300'),
      a: { x: 0, y: 0 },
      b: { x: 6000, y: 4000 },
    });
  });
});

test('S2 / obrys budovy a polovalba: klik do budovy, ref. čára po líci jádra, výška z vršku stěn', async ({
  page,
}) => {
  await page.getByTestId('tool-roof').click();
  await page.getByTestId('roof-method-building').click();
  await page.getByTestId('roof-shape-halfhip').click();
  await clickAt(page, 3000, 2000);
  const [r] = await roofs(page);
  expect(r?.outline).toHaveLength(4);
  const b = box(r!.outline);
  // Obrys obepíná dům (líc jádra stěn), výška ref. čáry = vršek stěn (výška podlaží 3000).
  expect(b.x1 - b.x0).toBeGreaterThanOrEqual(6000);
  expect(b.y1 - b.y0).toBeGreaterThanOrEqual(4000);
  expect(r?.refOffset).toBe(3000);
  expect(r?.edges.filter((e) => e.kind === 'halfhip')).toHaveLength(2);
  expect(r?.planes).toBe(4);
});

test('S2 / tažení hrany: kolečko uprostřed hrany posune hranu, sousední se prodlouží, Ctrl+Z', async ({
  page,
}) => {
  const id = await page.evaluate(() => {
    const h = window.__bim!;
    const typeId = Object.keys(h.model().roofTypes)[0];
    return h.run('roof.create', {
      storeyId: h.storeyId(),
      typeId,
      rect: { a: { x: 0, y: 0 }, b: { x: 6000, y: 4000 } },
    })[0]!;
  });
  // Výběr střechy klikem do plochy (uvnitř domu není místnost ani deska).
  await clickAt(page, 3000, 1000);
  await expect.poll(() => page.evaluate(() => window.__bim!.selection().roofs)).toEqual([id]);
  // Hrana 4 (x = 0) o 1000 mm ven tažením za kolečko uprostřed.
  await dragPx(page, await px(page, 0, 2000), await px(page, -1000, 2000));
  await expect.poll(async () => box((await roofs(page))[0]!.outline).x0).toBe(-1000);
  const after = box((await roofs(page))[0]!.outline);
  expect([after.x1, after.y0, after.y1]).toEqual([6000, 0, 4000]);
  await page.keyboard.press('Control+z');
  await expect.poll(async () => box((await roofs(page))[0]!.outline).x0).toBe(0);
});
