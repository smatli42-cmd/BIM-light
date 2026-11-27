import { expect, test, type Page } from '@playwright/test';
import { allSlabs, polygonArea, type Model } from '@bim-light/core';
import { clickAt, dragPx, model, moveTo, open, px, room, selection } from './helpers.ts';

test.beforeEach(async ({ page }) => {
  await open(page);
});

const slabs = async (page: Page) => allSlabs((await model(page)) as unknown as Model);
const areaM2 = (o: readonly { x: number; y: number }[]) => Math.round(polygonArea(o) / 1e4) / 100;

/** Deska ŽB strop 250 – obdélník 4000 × 3000 příkazem. */
async function rcSlab(page: Page) {
  return page.evaluate(() => {
    const h = window.__bim!;
    const typeId = Object.values(h.model().slabTypes).find((t) => t.name === 'ŽB strop 250')!.id;
    return h.run('slab.create', {
      storeyId: h.storeyId(),
      typeId,
      rect: { a: { x: 0, y: 0 }, b: { x: 4000, y: 3000 } },
    })[0]!;
  });
}

test.describe('D2: nástroj Deska v sandboxu', () => {
  test('D2: mnohoúhelník – body klikem, klik na první bod obrys uzavře', async ({ page }) => {
    await moveTo(page, 6000, 6000);
    await page.keyboard.press('s');
    await expect(page.getByTestId('new-slab-type')).toBeVisible();
    for (const [x, y] of [
      [0, 0],
      [4000, 0],
      [4000, 3000],
      [0, 3000],
      [0, 0],
    ] as const)
      await clickAt(page, x, y);
    const [s] = await slabs(page);
    expect(s?.outline).toHaveLength(4);
    expect(areaM2(s!.outline)).toBe(12);
    expect(s?.topOffset).toBe(-150);
  });

  test('D2: obdélník a natočený obdélník z info boxu; horní hrana k podlaží', async ({ page }) => {
    await page.keyboard.press('s');
    await page.getByTestId('slab-method-rect').click();
    const top = page.getByTestId('new-slab-top');
    await top.fill('-200');
    await top.press('Enter');
    await clickAt(page, 0, 0);
    await clickAt(page, 2000, 1000);
    await page.getByTestId('slab-method-rotated').click();
    await clickAt(page, 0, 2000);
    await clickAt(page, 2000, 4000);
    await clickAt(page, 1000, 5000);
    const [a, b] = await slabs(page);
    expect(areaM2(a!.outline)).toBeCloseTo(2, 1);
    expect(a?.topOffset).toBe(-200);
    // Hrana 2000·√2 ≈ 2828, šířka = vzdálenost bodu (1000, 5000) od přímky hrany = 1414 → 4 m².
    expect(areaM2(b!.outline)).toBeCloseTo(4, 1);
  });

  test('D2: podle stěn – klik na čtyři stěny, Enter; obrys po vnitřním líci', async ({ page }) => {
    await room(page);
    await page.keyboard.press('s');
    await page.getByTestId('slab-method-walls').click();
    for (const [x, y] of [
      [-150, 1500],
      [2000, 3150],
      [4150, 1500],
      [2000, -150],
    ] as const)
      await clickAt(page, x, y);
    await page.keyboard.press('Enter');
    const [s] = await slabs(page);
    expect(areaM2(s!.outline)).toBe(12);
  });

  test('D2: výběr desky klikem, info box, tažení bodu obrysu a smazání Del', async ({ page }) => {
    const id = await rcSlab(page);
    await clickAt(page, 2000, 1500);
    expect((await selection(page)).slabs).toEqual([id]);
    await expect(page.getByTestId('slab-area')).toHaveText('12,00 m²');
    await expect(page.getByTestId('slab-top-level')).toHaveText('−0,150');
    await dragPx(page, await px(page, 4000, 3000), await px(page, 5000, 3000));
    const [s] = await slabs(page);
    expect(areaM2(s!.outline)).toBeCloseTo(13.5, 1);
    await page.keyboard.press('Delete');
    expect(await slabs(page)).toHaveLength(0);
  });

  test('D2: tažení desky ji posune; rámeček zprava vybere i protnutou desku', async ({ page }) => {
    await rcSlab(page);
    await dragPx(page, await px(page, 2000, 1500), await px(page, 3000, 1500));
    const [s] = await slabs(page);
    expect(Math.min(...s!.outline.map((p) => p.x))).toBe(1000);
    await page.keyboard.press('Escape');
    await dragPx(page, await px(page, 2500, 5000), await px(page, 500, -500));
    expect((await selection(page)).slabs).toHaveLength(1);
  });

  test('D3: nástroj Otvor → V desce: obdélník prořízne strop i podlahu; klik vybere, Del smaže', async ({
    page,
  }) => {
    const rc = await rcSlab(page);
    const floor = await page.evaluate(() => {
      const h = window.__bim!;
      const typeId = Object.values(h.model().slabTypes).find((t) => t.name === 'Podlaha anhydrit 150')!.id;
      const rect = { a: { x: 0, y: 0 }, b: { x: 4000, y: 3000 } };
      return h.run('slab.create', { storeyId: h.storeyId(), typeId, rect })[0]!;
    });
    await page.keyboard.press('o');
    await page.getByTestId('opening-host-slab').click();
    await clickAt(page, 1000, 1000);
    await clickAt(page, 2000, 2000);
    const holes = Object.values((await model(page)).slabOpenings);
    expect(holes).toHaveLength(1);
    expect([...holes[0]!.hostIds].sort()).toEqual([rc, floor].sort());
    await page.keyboard.press('Escape');
    await clickAt(page, 1500, 1500);
    expect((await selection(page)).slabOpenings).toHaveLength(1);
    await expect(page.getByTestId('hole-area')).toHaveText(/^(0,9\d|1,0\d) m²$/);
    await dragPx(page, await px(page, 2000, 2000), await px(page, 2500, 2000));
    expect(areaM2(Object.values((await model(page)).slabOpenings)[0]!.outline)).toBeCloseTo(1.25, 1);
    await page.keyboard.press('Delete');
    expect(Object.keys((await model(page)).slabOpenings)).toHaveLength(0);
    expect(await slabs(page)).toHaveLength(2);
  });
});
