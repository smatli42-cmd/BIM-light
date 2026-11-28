// Prohlížečové testy popisu skladby v okně řezu (úkol uživatele 2026-11-28; Revit Multi-layer tag, Archicad
// Composite label): ukázka má v Řezu A tři popisy; nástroj Popis skladby – klik na řezaný strop, druhý klik
// = poloha textu; info box s řádky z typu a volbami; tažení textu, Esc, Del.
import { expect, test, type Page } from '@playwright/test';

interface Row {
  elementId: string;
  category: string;
  u0: number;
  u1: number;
  bottom: number;
  top: number;
}
interface Tag {
  id: string;
  elementId: string;
  numbered: boolean;
  textAt: { x: number; y: number } | null;
  lines: string[] | null;
}

async function at(page: Page, u: number, z: number) {
  const c = page.getByTestId('section-canvas');
  const box = (await c.boundingBox())!;
  const v = JSON.parse((await c.getAttribute('data-view')) ?? '{}') as { s: number; ox: number; oy: number };
  return { x: box.x + v.ox + u * v.s, y: box.y + v.oy - z * v.s };
}

async function click(page: Page, u: number, z: number) {
  const p = await at(page, u, z);
  await page.mouse.move(p.x, p.y, { steps: 2 });
  await page.mouse.down();
  await page.mouse.up();
}

const sectionId = (page: Page) =>
  page.evaluate(() => Object.values(window.__bim!.model().sections).find((s) => s.name === 'Řez A')!.id);
const tags = async (page: Page) => {
  const id = await sectionId(page);
  return page.evaluate(
    (sid) => window.__bim!.query('compositionTag.list', { sectionId: sid }),
    id,
  ) as Promise<Tag[]>;
};

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1700, height: 1000 });
  await page.goto('./?ukazka=popis-skladeb');
  await page.waitForFunction(() => !!window.__bim);
  await page.getByTestId('ct-project').click();
  await page.getByTestId('open-section-Řez A').click();
  await expect(page.getByTestId('section-canvas')).toHaveAttribute('data-view', /"s"/);
});

test('úkol uživatele / popis skladby: ukázka, vložení na strop, info box, tažení textu, Del', async ({
  page,
}) => {
  expect(await tags(page)).toHaveLength(3);
  const sid = await sectionId(page);
  const content = (await page.evaluate(
    (id) => window.__bim!.query('section.elements', { sectionId: id }),
    sid,
  )) as { cut: Row[] };
  // Strop nad 1.NP: řezaná nosná deska nejvýš pod 3000.
  const slab = content.cut
    .filter((r) => r.category === 'slab' && r.top <= 3000 && r.top > 2000)
    .sort((a, b) => b.u1 - b.u0 - (a.u1 - a.u0))[0]!;
  const u = slab.u0 + (slab.u1 - slab.u0) * 0.7;
  await page.getByTestId('tool-compositionTag').click();
  await expect(page.getByTestId('tag-default-numbered')).toBeVisible();
  await page.getByTestId('tag-default-numbered').check();
  await click(page, u, (slab.bottom + slab.top) / 2);
  await click(page, u + 800, slab.top + 1200);
  await expect.poll(async () => (await tags(page)).length).toBe(4);
  const made = (await tags(page)).find((t) => t.elementId === slab.elementId && t.numbered)!;
  expect(made.lines?.[1]).toMatch(/^1\. /);
  // Esc ukončí nástroj, klik na text popis vybere, info box ukáže řádky z typu.
  await page.keyboard.press('Escape');
  await expect.poll(() => page.evaluate(() => window.__bim!.tool())).toBe('select');
  const t0 = made.textAt!;
  await click(page, t0.x + 300, t0.y - 150);
  await expect(page.getByTestId('infobox-title')).toHaveText('Popis skladby');
  await expect(page.getByTestId('tag-lines')).toContainText('ŽB strop');
  await page.getByTestId('tag-thickness').uncheck();
  await expect
    .poll(async () => (await tags(page)).find((t) => t.id === made.id)?.lines?.[1])
    .not.toMatch(/mm$/);
  // Tažení textu posune jen text (bod uchycení zůstane na stropu).
  const a = await at(page, t0.x + 300, t0.y - 150);
  const b = await at(page, t0.x + 1300, t0.y - 150);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps: 5 });
  await page.mouse.up();
  await expect
    .poll(async () => Math.round((await tags(page)).find((t) => t.id === made.id)?.textAt?.x ?? 0))
    .toBeGreaterThan(t0.x + 700);
  await page.keyboard.press('Delete');
  await expect.poll(async () => (await tags(page)).length).toBe(3);
});
