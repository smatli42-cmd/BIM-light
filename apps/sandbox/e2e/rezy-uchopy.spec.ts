// Prohlížečové testy úchopů v okně řezu (pokyn uživatele 2026-11-27; základ 25): vybraná stěna má úchop na
// vršku – tažení změní výšku, číslo v trackeru a Enter, Esc zruší, Ctrl+Z vrátí; spodní úchop okna = parapet.
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

interface Grip {
  elementId: string;
  edge: 'top' | 'bottom';
  u: number;
  z: number;
  value: number;
}

/** Stěna s oknem a okno v Řezu A scény rezy-uchopy. */
const scene = (page: Page) =>
  page.evaluate(() => {
    const b = window.__bim!;
    const m = b.model();
    const sec = Object.values(m.sections).find((s) => s.name === 'Řez A')!;
    const win = Object.values(m.openings)[0]!;
    return { sectionId: sec.id, wallId: win.hostId, winId: win.id };
  });

const grips = (page: Page, sectionId: string, id: string) =>
  page.evaluate(
    ([sectionId, id]) =>
      (window.__bim!.query('section.grips', { sectionId, elementIds: [id] }) as { grips: Grip[] }).grips,
    [sectionId, id] as const,
  );

const grip = async (page: Page, sectionId: string, id: string, edge: 'top' | 'bottom') =>
  (await grips(page, sectionId, id)).find((g) => g.edge === edge)!;

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1700, height: 1000 });
  await page.goto('./?ukazka=rezy-uchopy');
  await page.waitForFunction(() => !!window.__bim);
  await page.getByTestId('ct-project').click();
  await page.getByTestId('open-section-Řez A').click();
  await expect(page.getByTestId('section-canvas')).toHaveAttribute('data-view', /"s"/);
});

test('pravidla-interakce / úchopy v řezu: tažení vršku stěny, číslo v trackeru, Esc, Ctrl+Z', async ({
  page,
}) => {
  const { sectionId, wallId } = await scene(page);
  const top = await grip(page, sectionId, wallId, 'top');
  await click(page, top.u, 500);
  await expect
    .poll(async () => (await page.evaluate(() => window.__bim!.selection())).walls)
    .toEqual([wallId]);
  // Tažení vršku dolů o ~400 mm (Alt = bez přichycení).
  const a = await at(page, top.u, top.z);
  const b = await at(page, top.u, top.z - 400);
  await page.mouse.move(a.x, a.y, { steps: 2 });
  await page.mouse.down();
  await page.keyboard.down('Alt');
  await page.mouse.move(b.x, b.y, { steps: 6 });
  await expect(page.getByTestId('section-tracker-Výška')).toBeVisible();
  await page.mouse.up();
  await page.keyboard.up('Alt');
  const dragged = await grip(page, sectionId, wallId, 'top');
  expect(Math.abs(dragged.z - (top.z - 400))).toBeLessThan(40);
  // Klik na úchop, napsat výšku 2500 a Enter.
  const c = await at(page, dragged.u, dragged.z);
  await page.mouse.move(c.x, c.y, { steps: 2 });
  await page.mouse.down();
  await page.mouse.up();
  await page.mouse.move(c.x, c.y - 30, { steps: 3 });
  await page.keyboard.type('2500');
  await expect(page.getByTestId('section-tracker-Výška')).toContainText('2500');
  await page.keyboard.press('Enter');
  await expect.poll(async () => (await grip(page, sectionId, wallId, 'top')).value).toBe(2500);
  // Esc zruší rozpracované tažení.
  const d = await at(page, dragged.u, (await grip(page, sectionId, wallId, 'top')).z);
  await page.mouse.move(d.x, d.y, { steps: 2 });
  await page.mouse.down();
  await page.mouse.move(d.x, d.y + 60, { steps: 4 });
  await page.keyboard.press('Escape');
  await page.mouse.up();
  expect((await grip(page, sectionId, wallId, 'top')).value).toBe(2500);
  // Jedno Undo vrátí jedno tažení.
  await page.keyboard.press('Control+z');
  await expect.poll(async () => (await grip(page, sectionId, wallId, 'top')).z).toBeCloseTo(dragged.z, 0);
});

test('pravidla-interakce / úchopy v řezu: spodní úchop okna mění parapet, nadpraží stojí', async ({
  page,
}) => {
  const { sectionId, winId } = await scene(page);
  const bottom = await grip(page, sectionId, winId, 'bottom');
  const top0 = (await grip(page, sectionId, winId, 'top')).z;
  await click(page, bottom.u, bottom.z + 600);
  await expect
    .poll(async () => (await page.evaluate(() => window.__bim!.selection())).openings)
    .toEqual([winId]);
  const a = await at(page, bottom.u, bottom.z);
  const b = await at(page, bottom.u, bottom.z - 300);
  await page.mouse.move(a.x, a.y, { steps: 2 });
  await page.mouse.down();
  await page.keyboard.down('Alt');
  await page.mouse.move(b.x, b.y, { steps: 6 });
  await expect(page.getByTestId('section-tracker-Parapet')).toBeVisible();
  await page.mouse.up();
  await page.keyboard.up('Alt');
  const after = await grip(page, sectionId, winId, 'bottom');
  expect(Math.abs(after.value - 600)).toBeLessThan(40);
  expect((await grip(page, sectionId, winId, 'top')).z).toBe(top0);
});
