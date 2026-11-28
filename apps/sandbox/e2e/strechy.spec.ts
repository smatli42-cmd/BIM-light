// Prohlížečové testy střech (rozhodnutí 11, krok S1): ukázka „strechy“ – klik na hřeben vybere střechu,
// info box (Okap abs., hrany), přepnutí štítu na sklon přepočítá roviny, Del a Ctrl+Z; výběr ve 3D.
import { expect, test, type Page } from '@playwright/test';

interface Line {
  kind: string;
  a: { x: number; y: number };
  b: { x: number; y: number };
}
interface RoofRow {
  id: string;
  planes: number;
  edges: { kind: string }[];
}

const roofs = (page: Page) => page.evaluate(() => window.__bim!.query('roof.list', {})) as Promise<RoofRow[]>;
const lines = (page: Page, roofId: string) =>
  page.evaluate(
    (id) => (window.__bim!.query('roof.planes', { roofId: id }) as { lines: Line[] }).lines,
    roofId,
  );

/** Sedlová střecha ukázky (má štíty). */
async function gableRoof(page: Page): Promise<RoofRow> {
  return (await roofs(page)).find((r) => r.edges.some((e) => e.kind === 'gable'))!;
}

test('rozhodnutí 11 / střechy: klik na hřeben vybere střechu, info box, štít → sklon, Del a Ctrl+Z', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1700, height: 1000 });
  await page.goto('./?ukazka=strechy');
  await page.waitForFunction(() => !!window.__bim);
  expect(await roofs(page)).toHaveLength(3);
  const roof = await gableRoof(page);
  expect(roof.planes).toBe(2);
  await page.evaluate(() => window.__bim!.setView(0.03, 100, 500));
  const ridge = (await lines(page, roof.id)).find((l) => l.kind === 'ridge')!;
  // Bod na hřebenu ve čtvrtině délky (střed hřebenu může křížit jiná čára).
  const x = ridge.a.x + (ridge.b.x - ridge.a.x) * 0.25;
  const y = ridge.a.y + (ridge.b.y - ridge.a.y) * 0.25;
  const p = await page.evaluate(([a, b]) => window.__bim!.toPage(a, b), [x, y] as const);
  await page.mouse.move(p.x, p.y, { steps: 2 });
  await page.mouse.down();
  await page.mouse.up();
  await expect.poll(() => page.evaluate(() => window.__bim!.selection().roofs)).toEqual([roof.id]);
  await expect(page.getByTestId('infobox-title')).toHaveText('Střecha');
  await expect(page.getByTestId('roof-ref-abs')).toHaveText('+3,000');
  await expect(page.getByTestId('roof-eave-abs')).toHaveText(/^\+2,5/);
  // Štít (hrana 2) → sklon: vznikne třetí rovina (polovalba / valba na té straně).
  const kind = page.getByTestId('roof-edge-kind-1');
  await expect(kind).toHaveValue('gable');
  await kind.selectOption('slope');
  await expect.poll(async () => (await gableRoof(page))?.planes ?? 3).toBe(3);
  await page.keyboard.press('Delete');
  await expect.poll(async () => (await roofs(page)).length).toBe(2);
  await page.keyboard.press('Control+z');
  await expect.poll(async () => (await roofs(page)).length).toBe(3);
});

test('rozhodnutí 11 / střechy: 3D – tělesa střech, klik vybere střechu', async ({ page }) => {
  await page.setViewportSize({ width: 1700, height: 1000 });
  await page.goto('./?ukazka=strechy&3d');
  await expect.poll(() => page.evaluate(() => window.__bim3d?.drawn())).toBe(true);
  const ids = (await roofs(page)).map((r) => r.id);
  const shown = await page.evaluate(() => window.__bim3d!.elements());
  expect(shown).toEqual(expect.arrayContaining(ids));
  const [id, at] = await page.evaluate((list) => {
    for (const r of list) {
      const p = window.__bim3d!.hitOf(r);
      if (p) return [r, p] as const;
    }
    throw new Error('žádná střecha není ve 3D vidět');
  }, ids);
  await page.mouse.click(at.x, at.y);
  await expect.poll(() => page.evaluate(() => window.__bim!.selection().roofs)).toEqual([id]);
  await expect(page.getByTestId('sel-roof')).toBeVisible();
});
