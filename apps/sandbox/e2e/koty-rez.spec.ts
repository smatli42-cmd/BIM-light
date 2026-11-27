// Prohlížečové testy kóty v okně řezu (hlášení uživatele 2026-11-27: „Nejde mi nijak vložit kóta do výkresu“ –
// v okně řezu nástroj Kóta nic nedělal, e2e dosud kótovaly jen v půdorysu). Kóta mezi úrovněmi 1.NP a 2.NP:
// dva kliky na úrovně, třetí umístí kótovací čáru; výběr klikem na čáru, posun, Del; Esc ukončí nástroj.
import { expect, test, type Page } from '@playwright/test';

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

const dims = (page: Page) =>
  page.evaluate(() => Object.values(window.__bim!.model().sectionDims ?? {})) as Promise<
    { offset: number; orientation: string }[]
  >;

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1700, height: 1000 });
  await page.goto('./?ukazka=rezy');
  await page.waitForFunction(() => !!window.__bim);
  await page.getByTestId('ct-project').click();
  await page.getByTestId('open-section-Řez A').click();
  await expect(page.getByTestId('section-canvas')).toHaveAttribute('data-view', /"s"/);
});

for (const style of ['Studie', 'Projekt'])
  test(`hlášení uživatele / kóta v řezu (${style}): úroveň 1.NP → 2.NP, třetí klik čára, výběr, posun, Del`, async ({
    page,
  }) => {
    await page.getByTestId('section-style').selectOption({ label: style });
    await page.getByTestId('tool-dimension').click();
    await click(page, 1000, 0);
    await click(page, 1000, 3000);
    await click(page, 600, 1500);
    await expect.poll(async () => (await dims(page)).length).toBe(1);
    expect((await dims(page))[0]?.orientation).toBe('vertical');
    await page.keyboard.press('Escape');
    await expect.poll(() => page.evaluate(() => window.__bim!.tool())).toBe('select');
    const a = await at(page, 600, 1500);
    const b = await at(page, 300, 1500);
    await page.mouse.move(a.x, a.y);
    await page.mouse.down();
    await page.mouse.move(b.x, b.y, { steps: 5 });
    await page.mouse.up();
    await expect.poll(async () => Math.round((await dims(page))[0]?.offset ?? 0)).toBeLessThan(450);
    await page.keyboard.press('Delete');
    await expect.poll(async () => (await dims(page)).length).toBe(0);
  });
