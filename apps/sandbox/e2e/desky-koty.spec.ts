// Prohlížečové testy: přesný otvor v desce (pokyn uživatele 2026-11-27) – dočasné kóty při kreslení
// i po výběru, klik na číslo posune, tracker Šířka / Hloubka u obdélníku, přichycení k rohu desky.
import { expect, test, type Page } from '@playwright/test';
import { clickAt, model, moveTo, open, room, temps } from './helpers.ts';

test.beforeEach(async ({ page }) => {
  await open(page);
});

/** Místnost 4000 × 3000 (vnitřní líce) a strop po vnitřní líc. */
async function scene(page: Page) {
  await room(page);
  await page.evaluate(() => {
    const h = window.__bim!;
    const typeId = Object.values(h.model().slabTypes).find((t) => t.name === 'ŽB strop 250')!.id;
    h.run('slab.create', {
      storeyId: h.storeyId(),
      typeId,
      rect: { a: { x: 0, y: 0 }, b: { x: 4000, y: 3000 } },
    });
  });
}

async function typeInto(page: Page, at: { x: number; y: number }, value: string) {
  await page.mouse.click(at.x, at.y);
  const input = page.getByTestId('value-edit');
  await expect(input).toBeVisible();
  await input.fill(value);
  await input.press('Enter');
}

const temp = async (page: Page, key: string) => (await temps(page)).find((t) => t.key === key);
const holes = async (page: Page) => Object.values((await model(page)).slabOpenings);

test.describe('otvor v desce: pomocné čáry a kóty', () => {
  test('katalog kreslení 3.3: kóty při kreslení, číslo posune roh, tracker Šířka / Hloubka', async ({
    page,
  }) => {
    await scene(page);
    await page.keyboard.press('o');
    await page.getByTestId('opening-host-slab').click();
    await moveTo(page, 1003, 1004);
    // Před prvním klikem kóty od kurzoru (přichyceno na 10 mm).
    await expect.poll(async () => (await temp(page, 'ol-x-'))?.value).toBe(1000);
    await clickAt(page, 1003, 1004);
    await typeInto(page, (await temp(page, 'ol-x-'))!.text, '600');
    await expect.poll(async () => (await temp(page, 'ol-x-'))?.value).toBe(600);
    await moveTo(page, 2500, 2500);
    await page.keyboard.type('800');
    await page.keyboard.press('Tab');
    await page.keyboard.type('500');
    await page.keyboard.press('Enter');
    const [h] = await holes(page);
    // Roh y podle kliknutí (zaokrouhleno na 10 mm podle px), x posunuté kótou; šířka a hloubka napsané.
    const [p0, , p2] = h!.outline;
    expect(p0!.x).toBe(600);
    expect([p2!.x - p0!.x, p2!.y - p0!.y]).toEqual([800, 500]);
  });

  test('katalog kreslení 3.3: vybraný otvor má kóty k lícům; klik na číslo ho posune', async ({ page }) => {
    await scene(page);
    await page.evaluate(() => {
      const h = window.__bim!;
      h.run('slabOpening.create', {
        storeyId: h.storeyId(),
        rect: { a: { x: 1000, y: 1000 }, b: { x: 2000, y: 1500 } },
      });
    });
    await clickAt(page, 1500, 1250);
    await expect.poll(async () => (await temp(page, 'ol-y+'))?.value).toBe(1500);
    await typeInto(page, (await temp(page, 'ol-y+'))!.text, '1200');
    const [h] = await holes(page);
    expect(h!.outline[0]).toEqual({ x: 1000, y: 1300 });
    expect((await temp(page, 'ol-x+'))?.value).toBe(2000);
  });

  test('základ 20: nástroj Otvor se přichytí k rohu desky a ukáže pomocnou čáru z rohu otvoru', async ({
    page,
  }) => {
    await page.evaluate(() => {
      const h = window.__bim!;
      const typeId = Object.values(h.model().slabTypes).find((t) => t.name === 'ŽB strop 250')!.id;
      h.run('slab.create', {
        storeyId: h.storeyId(),
        typeId,
        rect: { a: { x: 0, y: 0 }, b: { x: 4000, y: 3000 } },
      });
      h.run('slabOpening.create', {
        storeyId: h.storeyId(),
        rect: { a: { x: 1000, y: 1000 }, b: { x: 2000, y: 1500 } },
      });
    });
    await page.keyboard.press('o');
    await page.getByTestId('opening-host-slab').click();
    await moveTo(page, 3995, 2995);
    const o = await page.evaluate(() => window.__bim!.overlay());
    expect(o.snap?.label).toMatch(/^roh/);
    await moveTo(page, 2004, 2500);
    const g = await page.evaluate(() => window.__bim!.overlay());
    expect(g.snap?.point.x).toBe(2000);
    expect(g.guides?.length).toBeGreaterThan(0);
  });
});
