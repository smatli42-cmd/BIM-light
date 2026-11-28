// Prohlížečové testy popisu skladby v okně řezu (úkol uživatele 2026-11-28; Revit Multi-layer tag, Archicad
// Composite label; pokyn uživatele 2026-11-28 – čára kolmo ke konstrukci, lomená, číslo v kolečku): ukázka
// má v Řezu A tři popisy; nástroj Popis skladby – klik do stropu, lomy, Enter; nastavení popisky v info boxu.
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
  side: string;
  align: string;
  markText: string | null;
  end: { x: number; y: number } | null;
  path: { x: number; y: number }[] | null;
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

test('pokyn uživatele / popis skladby: lomená čára kolmo ke stropu, kolečko s číslem, nastavení, tažení, Del', async ({
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
  const u = slab.u0 + (slab.u1 - slab.u0) * 0.4;
  await page.getByTestId('tool-compositionTag').click();
  await page.getByTestId('tag-default-numbered').check();
  // Klik do stropu, lom šikmo nad ním (srovná se svisle nad bod), vodorovně doprava, Enter.
  await click(page, u, (slab.bottom + slab.top) / 2);
  await click(page, u + 300, slab.top + 1500);
  await click(page, u + 2000, slab.top + 1600);
  await page.keyboard.press('Enter');
  await expect.poll(async () => (await tags(page)).length).toBe(4);
  const made = (await tags(page)).find((t) => t.elementId === slab.elementId && t.numbered)!;
  expect(made.markText).toBe('D1');
  expect(made.lines?.[0]).toMatch(/^1\. .* tl\. \d+ mm$/);
  const path = made.path!;
  expect(Math.round(path[1]!.x)).toBe(Math.round(path[0]!.x));
  expect(Math.round(path[2]!.y)).toBe(Math.round(path[1]!.y));
  // Esc ukončí nástroj, klik na řádek popis vybere, info box ukáže nastavení popisky.
  await page.keyboard.press('Escape');
  await expect.poll(() => page.evaluate(() => window.__bim!.tool())).toBe('select');
  const e0 = made.end!;
  await click(page, e0.x + 700, e0.y - 450);
  await expect(page.getByTestId('infobox-title')).toHaveText('Popis skladby');
  await expect(page.getByTestId('tag-lines')).toContainText('(D1)');
  await page.getByTestId('tag-thickness').uncheck();
  await expect
    .poll(async () => (await tags(page)).find((t) => t.id === made.id)?.lines?.[0])
    .not.toMatch(/mm$/);
  await page.getByTestId('tag-side').selectOption('left');
  await expect.poll(async () => (await tags(page)).find((t) => t.id === made.id)?.side).toBe('left');
  await page.getByTestId('tag-align').selectOption('center');
  await expect.poll(async () => (await tags(page)).find((t) => t.id === made.id)?.align).toBe('center');
  // Tažení kolečka posune konec čáry, úseky zůstanou v pravých úhlech.
  const a = await at(page, e0.x, e0.y);
  const b = await at(page, e0.x + 1000, e0.y + 200);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps: 5 });
  await page.mouse.up();
  await expect
    .poll(async () => Math.round((await tags(page)).find((t) => t.id === made.id)?.end?.x ?? 0))
    .toBeGreaterThan(e0.x + 700);
  await page.keyboard.press('Delete');
  await expect.poll(async () => (await tags(page)).length).toBe(3);
});
