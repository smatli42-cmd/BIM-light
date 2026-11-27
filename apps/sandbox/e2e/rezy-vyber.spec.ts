// Prohlížečové testy výběru v okně řezu (pokyn uživatele 2026-11-27; pravidla-interakce → Výběr): klik vybere
// stěnu i desku a ukáže info box, Shift přidá, rámeček, Del smaže, výběr je společný s půdorysem (druhé okno),
// ve Studii i v Projektu.
import { expect, test, type Page } from '@playwright/test';

async function at(page: Page, u: number, z: number) {
  const c = page.getByTestId('section-canvas');
  const box = (await c.boundingBox())!;
  const v = JSON.parse((await c.getAttribute('data-view')) ?? '{}') as { s: number; ox: number; oy: number };
  return { x: box.x + v.ox + u * v.s, y: box.y + v.oy - z * v.s };
}

async function click(page: Page, u: number, z: number, shift = false) {
  const p = await at(page, u, z);
  await page.mouse.move(p.x, p.y, { steps: 2 });
  if (shift) await page.keyboard.down('Shift');
  await page.mouse.down();
  await page.mouse.up();
  if (shift) await page.keyboard.up('Shift');
}

type Row = { elementId: string; u0: number; u1: number; bottom: number; top: number };

/** Řezaná obvodová stěna 1.NP a strop nad 1.NP v Řezu A (z dotazu section.elements). */
const targets = (page: Page) =>
  page.evaluate(() => {
    const b = window.__bim!;
    const m = b.model();
    const sec = Object.values(m.sections).find((s) => s.name === 'Řez A')!;
    const cut = (b.query('section.elements', { sectionId: sec.id }) as { cut: Row[] }).cut;
    const upper = Object.values(m.storeys).find((s) => s.elevation > 0)!.id;
    const wall = cut.find((r) => m.elements[r.elementId]?.category === 'wall' && r.bottom <= 0)!;
    const slab = cut.find(
      (r) =>
        m.elements[r.elementId]?.storeyId === upper &&
        m.slabTypes[m.elements[r.elementId]!.typeId]?.slabFunction === 'structure',
    )!;
    return { wall, slab };
  });

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1700, height: 1000 });
  await page.goto('./?ukazka=rezy');
  await page.waitForFunction(() => !!window.__bim);
  await page.getByTestId('ct-project').click();
  await page.getByTestId('open-section-Řez A').click();
  await expect(page.getByTestId('section-canvas')).toHaveAttribute('data-view', /"s"/);
});

for (const style of ['Studie', 'Projekt'])
  test(`pravidla-interakce / výběr v řezu (${style}): klik stěna, Shift deska, info box, Esc`, async ({
    page,
  }) => {
    await page.getByTestId('section-style').selectOption({ label: style });
    const { wall, slab } = await targets(page);
    await click(page, (wall.u0 + wall.u1) / 2, 500);
    await expect
      .poll(async () => (await page.evaluate(() => window.__bim!.selection())).walls)
      .toEqual([wall.elementId]);
    await expect(page.getByTestId('infobox-title')).toHaveText('Stěna');
    // Hlášení uživatele: stěna jde vybrat po celé výšce (nad oknem i v pásku skladby podlahy pod ±0).
    for (const z of [2500, -100]) {
      await page.keyboard.press('Escape');
      await click(page, (wall.u0 + wall.u1) / 2, z);
      await expect
        .poll(async () => (await page.evaluate(() => window.__bim!.selection())).walls)
        .toEqual([wall.elementId]);
    }
    await click(page, (slab.u0 + slab.u1) / 2, (slab.bottom + slab.top) / 2, true);
    const sel = await page.evaluate(() => window.__bim!.selection());
    expect([sel.walls, sel.slabs]).toEqual([[wall.elementId], [slab.elementId]]);
    await page.keyboard.press('Escape');
    await expect.poll(async () => (await page.evaluate(() => window.__bim!.selection())).walls).toEqual([]);
  });

test('pravidla-interakce / výběr v řezu: rámeček, Del smaže, výběr je společný s půdorysem ve druhém okně', async ({
  page,
}) => {
  const { wall } = await targets(page);
  // Rámeček zprava doleva přes stěnu (protnuté prvky).
  const a = await at(page, wall.u1 + 50, 700);
  const b = await at(page, wall.u0 - 50, 300);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps: 6 });
  await page.mouse.up();
  await expect
    .poll(async () => (await page.evaluate(() => window.__bim!.selection())).walls)
    .toContain(wall.elementId);
  // Dvě okna: řez a půdorys vedle sebe (výběr je jedna společná služba pro všechna okna).
  await page.getByTestId('layout-2').click();
  await expect(page.getByTestId('section-canvas')).toBeVisible();
  await expect(page.getByTestId('drawing-canvas-passive')).toBeVisible();
  await page.waitForTimeout(100);
  // Půdorys ve druhém okně čte stejný výběr (s.selection) – stěna je vybraná i tam.
  expect((await page.evaluate(() => window.__bim!.selection())).walls).toContain(wall.elementId);
  await page.keyboard.press('Delete');
  await expect
    .poll(() => page.evaluate((id) => !!window.__bim!.model().elements[id], wall.elementId))
    .toBe(false);
});
