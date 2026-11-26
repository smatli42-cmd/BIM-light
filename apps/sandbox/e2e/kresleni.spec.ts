import { expect, test } from '@playwright/test';
import { clickAt, model, moveTo, open, px, selection, wall, walls } from './helpers.ts';

test.beforeEach(async ({ page }) => {
  await open(page);
});

test.describe('katalog-kresleni / část 1: kreslení stěny', () => {
  test('1.2–1.3: řetěz stěn, u kurzoru tracker s délkou a úhlem; napojení se uloží', async ({ page }) => {
    await page.keyboard.press('w');
    await clickAt(page, 0, 0);
    await moveTo(page, 3000, 0);
    await expect(page.getByTestId('tracker')).toBeVisible();
    await expect(page.getByTestId('tracker-Délka')).toContainText('3000');
    await clickAt(page, 3000, 0);
    await clickAt(page, 3000, 2000);
    const m = await model(page);
    expect(Object.keys(m.elements).length).toBe(2);
    expect(Object.keys(m.relations).length).toBe(1);
  });

  test('1.4: napsané číslo jde do délky, Tab přepne na úhel (90° = doprava), Enter potvrdí', async ({
    page,
  }) => {
    await page.keyboard.press('w');
    await clickAt(page, 0, 0);
    await moveTo(page, 1234, 37);
    await page.keyboard.type('2500');
    await expect(page.getByTestId('tracker-Délka')).toContainText('2500');
    await page.keyboard.press('Enter');
    await moveTo(page, 2500, -1000);
    await page.keyboard.type('1000');
    await page.keyboard.press('Tab');
    await expect(page.getByTestId('tracker-Úhel')).toHaveClass(/on/);
    await page.keyboard.type('90');
    await page.keyboard.press('Enter');
    const ws = await walls(page);
    const first = ws.find((w) => w.path.start.x === 0)!;
    expect(Math.hypot(first.path.end.x, first.path.end.y)).toBeCloseTo(2500, 6);
    const second = ws.find((w) => w !== first)!;
    const v = { x: second.path.end.x - second.path.start.x, y: second.path.end.y - second.path.start.y };
    const d1 = { x: first.path.end.x, y: first.path.end.y };
    expect(d1.x * v.y - d1.y * v.x).toBeLessThan(0);
    expect(Math.hypot(v.x, v.y)).toBeCloseTo(1000, 6);
  });

  test('1.5: klik na první bod obrys uzavře (4 stěny, 4 rohy)', async ({ page }) => {
    await page.keyboard.press('w');
    for (const [x, y] of [
      [0, 0],
      [0, 3000],
      [4000, 3000],
      [4000, 0],
      [0, 0],
    ] as const)
      await clickAt(page, x, y);
    await expect(page.getByTestId('toast')).toContainText('Obrys uzavřen');
    const m = await model(page);
    expect(Object.keys(m.elements).length).toBe(4);
    expect(Object.keys(m.relations).length).toBe(4);
  });

  test('1.5: Backspace vrátí poslední stěnu, Esc řetěz ukončí', async ({ page }) => {
    await page.keyboard.press('w');
    await clickAt(page, 0, 0);
    await clickAt(page, 3000, 0);
    await clickAt(page, 3000, 2000);
    await page.keyboard.press('Backspace');
    expect((await walls(page)).length).toBe(1);
    await page.keyboard.press('Escape');
    await moveTo(page, 5000, 0);
    await expect(page.getByTestId('tracker')).toHaveCount(0);
  });

  test('[R] 1: mezerník přehodí stranu nové stěny', async ({ page }) => {
    await page.keyboard.press('w');
    await page.keyboard.press(' ');
    await expect(page.getByTestId('new-side')).toContainText('vpravo');
    await clickAt(page, 0, 0);
    await clickAt(page, 3000, 0);
    expect((await walls(page))[0]?.side).toBe('right');
  });

  test('[R] 1: mezerník přehodí stranu i u vybrané stěny', async ({ page }) => {
    const id = await wall(page, { x: 0, y: 0 }, { x: 3000, y: 0 });
    await clickAt(page, 1500, 150);
    expect((await selection(page)).walls).toEqual([id]);
    await page.keyboard.press(' ');
    expect((await walls(page))[0]?.side).toBe('right');
  });
});

test.describe('katalog-kresleni / část 2: přichytávání', () => {
  test('[R] 2: úhlové kroky 0° / 90° / 45° a zaokrouhlení délky na 10 mm', async ({ page }) => {
    await page.keyboard.press('w');
    await clickAt(page, 0, 0);
    await clickAt(page, 2003, 60);
    await clickAt(page, 3480, 1460);
    const ws = await walls(page);
    const a = ws.find((w) => w.path.start.x === 0)!;
    expect(a.path.end.y).toBeCloseTo(0, 6);
    expect(a.path.end.x % 10).toBeCloseTo(0, 6);
    const b = ws.find((w) => w !== a)!;
    expect(b.path.end.x - b.path.start.x).toBeCloseTo(b.path.end.y - b.path.start.y, 6);
  });

  test('2.1: konec stěny se přichytí a popisek ukáže druh přichycení', async ({ page }) => {
    await wall(page, { x: 0, y: 0 }, { x: 3000, y: 0 });
    await page.keyboard.press('w');
    await moveTo(page, 3030, 30);
    const o = await page.evaluate(() => window.__bim!.overlay());
    expect(o.snap?.label).toContain('konec');
    await clickAt(page, 3030, 30);
    await clickAt(page, 3000, 2000);
    const ws = await walls(page);
    expect(ws[1]?.path.start).toEqual({ x: 3000, y: 0 });
  });

  test('2.3: klávesa C střídá kandidáty přichycení', async ({ page }) => {
    await wall(page, { x: 0, y: 0 }, { x: 3000, y: 0 });
    await page.keyboard.press('w');
    await moveTo(page, 2990, 10);
    const a = await page.evaluate(() => window.__bim!.overlay().snap);
    await page.keyboard.press('c');
    const b = await page.evaluate(() => window.__bim!.overlay().snap);
    expect(a?.label).toMatch(/1\/\d/);
    expect(b?.label).toMatch(/2\/\d/);
  });

  test('2.7: Alt přichytávání dočasně vypne', async ({ page }) => {
    await wall(page, { x: 0, y: 0 }, { x: 3000, y: 0 });
    await page.keyboard.press('w');
    await page.keyboard.down('Alt');
    await moveTo(page, 3030, 30);
    const o = await page.evaluate(() => window.__bim!.overlay());
    await page.keyboard.up('Alt');
    expect(o.snap).toBeNull();
  });

  test('2.4: pomocná čára vodorovně od rohu', async ({ page }) => {
    await wall(page, { x: 0, y: 0 }, { x: 0, y: 3000 });
    await page.keyboard.press('w');
    await moveTo(page, 2500, 3040);
    const o = await page.evaluate(() => window.__bim!.overlay());
    expect(o.guides?.length).toBeGreaterThan(0);
  });

  test('2.9: klávesy jdou do výkresu, když na něj najedeš myší', async ({ page }) => {
    await page.getByTestId('view-scale').focus();
    const p = await px(page, 0, 0);
    await page.mouse.move(p.x, p.y);
    await page.keyboard.press('w');
    expect(await page.evaluate(() => window.__bim!.tool())).toBe('wall');
  });
});

test.describe('pravidla-interakce / kontrolní seznam: vybrat čáru → stěna', () => {
  test('klik na líc v metodě Stěna z čáry (zkratka V) vytvoří stěnu po této čáře', async ({ page }) => {
    await wall(page, { x: 0, y: 0 }, { x: 3000, y: 0 });
    await page.keyboard.press('v');
    await clickAt(page, 1500, 300);
    const ws = await walls(page);
    expect(ws.length).toBe(2);
    expect(ws[1]?.path.start.y).toBeCloseTo(300, 6);
  });

  test('pokyn uživatele 2026-11-26: Stěna z čáry není samostatná ikona palety, ale metoda nástroje Stěna', async ({
    page,
  }) => {
    await expect(page.getByTestId('tool-pickline')).toHaveCount(0);
    await page.keyboard.press('w');
    await page.getByTestId('method-pick').click();
    expect(await page.evaluate(() => window.__bim!.tool())).toBe('pickline');
    await expect(page.getByTestId('method-pick')).toHaveAttribute('aria-pressed', 'true');
  });
});

test.describe('katalog-kresleni 2.6: mřížka', () => {
  test('mřížka je vypnutá; po zapnutí v Volbách se body stěny přichytí k jejím uzlům', async ({ page }) => {
    await expect(page.getByTestId('opt-grid')).not.toBeChecked();
    await page.getByTestId('opt-grid').check();
    await page.getByTestId('opt-grid-step').fill('500');
    await moveTo(page, 0, 0);
    await page.keyboard.press('w');
    await clickAt(page, 1040, 520);
    await clickAt(page, 2460, 1030);
    await page.keyboard.press('Escape');
    const [w] = await walls(page);
    expect(w?.path.start).toEqual({ x: 1000, y: 500 });
    expect(w?.path.end).toEqual({ x: 2500, y: 1000 });
  });
});

test.describe('závada: stěna k jiné stěně jiné šířky se někdy nenapojí', () => {
  test('stěna nakreslená myší z vnějšího rohu se napojí v T na kolmou stěnu', async ({ page }) => {
    const [, , , left] = await page.evaluate(() => {
      const h = window.__bim!;
      return h.run('wall.rectangle', {
        storeyId: h.storeyId(),
        typeId: h.typeId('Zdivo 300'),
        a: { x: 0, y: 0 },
        b: { x: 4000, y: 3000 },
      });
    });
    await moveTo(page, 0, 0);
    await page.keyboard.press('w');
    await clickAt(page, -300, 3300);
    await clickAt(page, -2000, 3300);
    await page.keyboard.press('Escape');
    const m = await model(page);
    const rels = Object.values(m.relations);
    const fresh = Object.values(m.elements).at(-1)!;
    const link = rels.find((r) => r.related.wallId === fresh.id || r.relating.wallId === fresh.id);
    expect(link?.relating).toEqual({ wallId: left, at: 'ATPATH' });
  });
  test('plan-steny / Z2 (závada): stěna nakreslená myší přes jinou stěnu se s ní napojí křížem', async ({
    page,
  }) => {
    await wall(page, { x: -2000, y: 0 }, { x: 2000, y: 0 });
    await page.keyboard.press('w');
    await clickAt(page, 0, -2000);
    await clickAt(page, 0, 2000);
    await page.keyboard.press('Escape');
    const rels = Object.values((await model(page)).relations);
    expect(rels.filter((r) => r.relating.at === 'ATPATH' && r.related.at === 'ATPATH')).toHaveLength(1);
  });
});
