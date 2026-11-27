// Hlášení uživatele 2026-11-27: fáze v řezu a u desek. Fáze ve spodní liště při aktivním okně řezu nastaví
// řez (ne půdorys); zbouraná stěna za rovinou má ve fázi Bourací práce žlutou pohledovou plochu. Deska má
// v info boxu Stav (fáze) a jde změnit.
import { expect, test, type Page } from '@playwright/test';

const phases = (page: Page) =>
  page.evaluate(() => {
    const b = window.__bim!;
    const m = b.model();
    const sec = Object.values(m.sections).find((s) => s.name === 'Řez B')!;
    return [sec.phaseFilterId, Object.values(m.views).map((v) => v.phaseFilterId)] as const;
  });

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1700, height: 1000 });
  await page.goto('./?ukazka=dum');
  await page.waitForFunction(() => !!window.__bim);
  await page.getByTestId('ct-project').click();
});

test('hlášení uživatele / fáze v řezu: Fáze ve spodní liště nastaví řez, bourání má žlutou plochu', async ({
  page,
}) => {
  await page.getByTestId('open-section-Řez B').click();
  await expect(page.getByTestId('section-canvas')).toHaveAttribute('data-view', /"s"/);
  await page.getByTestId('phase-menu').click();
  await page.getByTestId('phase-Bourací práce').click();
  await expect.poll(async () => (await phases(page))[0]).not.toBeNull();
  expect((await phases(page))[1].every((v) => v === null)).toBe(true);
  await expect(page.getByTestId('phase-menu')).toContainText('Bourací práce');
  await expect(page.getByTestId('section-canvas')).toHaveAttribute('data-primitives', /.+/);
  const yellow = await page.evaluate(() => {
    const m = window.__bim!.model();
    const sec = Object.values(m.sections).find((s) => s.name === 'Řez B')!;
    return (
      window.__bim!.query('section.elements', { sectionId: sec.id }) as { seen: { elementId: string }[] }
    ).seen.some((r) => m.elements[r.elementId]?.status === 'demolished');
  });
  expect(yellow).toBe(true);
});

test('hlášení uživatele / fáze desky: info box vybrané desky má Stav (fáze) a jde změnit', async ({
  page,
}) => {
  await page.getByTestId('open-section-Řez B').click();
  const c = page.getByTestId('section-canvas');
  await expect(c).toHaveAttribute('data-view', /"s"/);
  // Klik do základové desky v řezu (výběr v okně řezu) ji vybere.
  const row = await page.evaluate(() => {
    const m = window.__bim!.model();
    const sec = Object.values(m.sections).find((s) => s.name === 'Řez B')!;
    const cut = (
      window.__bim!.query('section.elements', { sectionId: sec.id }) as {
        cut: { elementId: string; u0: number; u1: number; bottom: number; top: number }[];
      }
    ).cut;
    return cut.find((r) => m.elements[r.elementId]?.category === 'slab')!;
  });
  const box = (await c.boundingBox())!;
  const v = JSON.parse((await c.getAttribute('data-view')) ?? '{}') as { s: number; ox: number; oy: number };
  const u = (row.u0 + row.u1) / 2;
  const z = (row.bottom + row.top) / 2;
  await page.mouse.click(box.x + v.ox + u * v.s, box.y + v.oy - z * v.s);
  await expect.poll(() => page.evaluate(() => window.__bim!.selection().slabs)).toEqual([row.elementId]);
  await expect(page.getByTestId('slab-status')).toHaveValue('existing');
  await page.getByTestId('slab-status').selectOption('demolished');
  await expect
    .poll(() => page.evaluate((id) => window.__bim!.model().elements[id]!.status, row.elementId))
    .toBe('demolished');
});
