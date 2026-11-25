import { expect, test } from '@playwright/test';
import { clickAt, clickPx, dragPx, model, moveTo, open, px, wall, walls } from './helpers.ts';

test.beforeEach(async ({ page }) => {
  await open(page);
});

const arcOf = async (page: Parameters<typeof model>[0]) => (await walls(page)).map((w) => w.path);

test.describe('plan-steny / Z5: oblouková stěna v sandboxu', () => {
  test('plan-steny / Z5: nástroj Oblouková stěna třemi body (začátek, konec, bod oblouku)', async ({
    page,
  }) => {
    await moveTo(page, 3000, 3000);
    await page.keyboard.press('a');
    await clickAt(page, 0, 0);
    await clickAt(page, 6000, 0);
    await clickAt(page, 3000, 1000);
    const [p] = await arcOf(page);
    expect(p?.kind).toBe('arc');
    expect(p?.start).toEqual({ x: 0, y: 0 });
    expect(p?.end).toEqual({ x: 6000, y: 0 });
    // Bod oblouku (3000, 1000) → poloměr 5000.
    const b = p && p.kind === 'arc' ? p.bulge : 0;
    const sweep = 4 * Math.atan(b);
    expect(6000 / 2 / Math.sin(Math.abs(sweep) / 2)).toBeCloseTo(5000, 0);
    await page.keyboard.press('Escape');
  });

  test('plan-steny / Z5: poloměr číslem v trackeru, řetěz tečně pokračuje (M)', async ({ page }) => {
    await moveTo(page, 3000, 3000);
    await page.keyboard.press('a');
    await clickAt(page, 0, 0);
    await clickAt(page, 6000, 0);
    await moveTo(page, 3000, 800);
    await page.keyboard.type('4000');
    await page.keyboard.press('Enter');
    let [p] = await arcOf(page);
    const r = (q: typeof p) => {
      const sweep = Math.abs(4 * Math.atan(q && q.kind === 'arc' ? q.bulge : 0));
      return q ? Math.hypot(q.end.x - q.start.x, q.end.y - q.start.y) / 2 / Math.sin(sweep / 2) : 0;
    };
    expect(r(p)).toBeCloseTo(4000, 0);
    await page.keyboard.press('m');
    await clickAt(page, 6000, 2500);
    const all = await walls(page);
    expect(all).toHaveLength(2);
    p = all[1]?.path;
    expect(p?.kind).toBe('arc');
    // Napojení v přímce (tečně): konec prvního = začátek druhého a vztah ATEND.
    const m = await model(page);
    expect(Object.values(m.relations)).toHaveLength(1);
    await page.keyboard.press('Escape');
  });

  test('plan-steny / Z5: tažení středu vybrané stěny ji zakřiví, Vyrovnat v nabídce ji narovná', async ({
    page,
  }) => {
    await wall(page, { x: 0, y: 0 }, { x: 6000, y: 0 });
    await clickAt(page, 1000, 150);
    // Kolečko zakřivení leží 16 px za protilehlým lícem (Zdivo 300 vlevo, líc y = 300).
    const g = (await page.evaluate(() => window.__bim!.grips())).find((x) => x.end === 'mid')!;
    const a = g.at;
    const b = await px(page, 3000, -1000);
    await dragPx(page, a, b);
    let [p] = await arcOf(page);
    expect(p?.kind).toBe('arc');
    // Oblouk přes (3000, −1000): poloměr 5000, střed (3000, 4000); tloušťka jde ke středu.
    await clickPx(page, await px(page, 1500, -620), 'right');
    await page.getByText('Vyrovnat stěnu').click();
    [p] = await arcOf(page);
    expect(p?.kind).toBe('line');
  });

  test('plan-steny / Z5: kruh ze dvou oblouků – bod druhého oblouku se přichytí na kružnici prvního', async ({
    page,
  }) => {
    await moveTo(page, 3000, 3000);
    await page.keyboard.press('a');
    await clickAt(page, 0, 0);
    await clickAt(page, 4000, 0);
    await clickAt(page, 2000, 2000);
    await clickAt(page, 0, 0);
    // Kliknuto 30 mm vedle kružnice: bod se přichytí, kružnice je stejná.
    await clickAt(page, 2000, -1970);
    await page.keyboard.press('Escape');
    const all = await walls(page);
    expect(all).toHaveLength(2);
    const radius = (p: (typeof all)[number]['path']) => {
      const sweep = Math.abs(4 * Math.atan(p.kind === 'arc' ? p.bulge : 0));
      return Math.hypot(p.end.x - p.start.x, p.end.y - p.start.y) / 2 / Math.sin(sweep / 2);
    };
    expect(radius(all[1]!.path)).toBeCloseTo(radius(all[0]!.path), 6);
    expect(Object.values((await model(page)).relations)).toHaveLength(2);
  });
});
