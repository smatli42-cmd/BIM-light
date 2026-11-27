// Prohlížečové testy: lišta 3D okna podle Ardit Designeru – Persp. / Axon., režim zobrazení, slunce
// a stíny, Řez ve 3D, mřížka, karta prvku, procházka. Koncepce rozhraní, část 2 E; docs/STAV-3d.md.
import { expect, test, type Page } from '@playwright/test';
import { model } from './helpers.ts';

const view = async (page: Page) => Object.values((await model(page)).views3d)[0]!;
const scene = (page: Page) => page.evaluate(() => window.__bim3d!.scene());

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1700, height: 1000 });
  await page.goto('./?ukazka=dum&3d');
  await expect.poll(() => page.evaluate(() => window.__bim3d?.drawn())).toBe(true);
});

test('3D lišta / Arditu: Persp. / Axon. a režim zobrazení jsou data 3D pohledu, Ctrl+Z je vrátí', async ({
  page,
}) => {
  await page.getByTestId('view3d-axon').click();
  await expect.poll(async () => (await scene(page)).projection).toBe('axonometric');
  expect((await view(page)).projection).toBe('axonometric');
  for (const mode of ['white', 'hidden-lines', 'sketch', 'wireframe']) {
    await page.getByTestId('view3d-mode').selectOption(mode);
    await expect.poll(async () => (await view(page)).renderMode).toBe(mode);
  }
  // Čárový režim: plochy se nekreslí, klik na prvek ho dál vybere.
  await expect.poll(() => page.evaluate(() => window.__bim3d!.drawn())).toBe(false);
  await page.keyboard.press('Control+z');
  await expect.poll(async () => (await view(page)).renderMode).toBe('sketch');
  await expect.poll(() => page.evaluate(() => window.__bim3d!.drawn())).toBe(true);
  await page.getByTestId('view3d-persp').click();
  await expect.poll(async () => (await scene(page)).projection).toBe('perspective');
});

test('3D lišta / Arditu: slunce a stíny – stíny zapnout, poloha podle data a času', async ({ page }) => {
  await page.getByTestId('view3d-sun').click();
  await page.getByTestId('view3d-shadows').check();
  await expect.poll(async () => (await scene(page)).shadows).toBe(true);
  await page.getByTestId('view3d-sun-mode').selectOption('time');
  await page.getByTestId('view3d-sun-date').fill('2026-12-21');
  await page.getByTestId('view3d-sun-time').fill('12:00');
  await expect
    .poll(async () => (await view(page)).sun)
    .toMatchObject({
      shadows: true,
      mode: 'time',
      date: '2026-12-21',
      time: '12:00',
    });
  // V zimě v poledne je slunce na jihu nízko (asi 17°).
  await expect(page.getByTestId('view3d-sun-at')).toContainText(/azimut 1[78]\d°, výška 1[5-8]°/);
});

test('3D lišta / Arditu: Řez ve 3D – svislý podle pohledu, posun úchytem, vodorovný, vypnout', async ({
  page,
}) => {
  await page.getByTestId('view3d-cut').click();
  await expect.poll(async () => (await view(page)).cutPlane).not.toBeNull();
  const p0 = (await view(page)).cutPlane!;
  expect(p0.normal.z).toBe(0);
  const h = (await page.evaluate(() => window.__bim3d!.cutHandle()))!;
  await page.mouse.move(h.x, h.y);
  await page.mouse.down();
  await page.mouse.move(h.x + 60, h.y - 30, { steps: 5 });
  await page.mouse.up();
  await expect.poll(async () => (await view(page)).cutPlane!.origin).not.toEqual(p0.origin);
  await page.getByTestId('view3d-cut-kind').selectOption('horizontal');
  await expect
    .poll(async () => (await view(page)).cutPlane)
    .toMatchObject({
      origin: { z: 1200 },
      normal: { x: 0, y: 0, z: -1 },
    });
  await page.getByTestId('view3d-cut').click();
  await expect.poll(async () => (await view(page)).cutPlane).toBeNull();
});

test('3D lišta / Arditu: mřížka v pracovní rovině a karta prvku po podržení myši', async ({ page }) => {
  await page.getByTestId('view3d-grid').click();
  await expect.poll(async () => (await scene(page)).grid).toBe(true);
  expect((await view(page)).grid).toBe(true);
  const m = await model(page);
  const wall = Object.values(m.elements).find((e) => e.category === 'wall')!;
  const at = (await page.evaluate((id) => window.__bim3d!.pageOf(id), wall.id))!;
  await page.mouse.move(at.x, at.y);
  await page.mouse.move(at.x + 1, at.y + 1);
  await expect(page.getByTestId('hover-card')).toBeVisible({ timeout: 3000 });
  await page.getByTestId('view3d-info').click();
  await page.mouse.move(at.x + 10, at.y + 10);
  await page.waitForTimeout(1200);
  await expect(page.getByTestId('hover-card')).toHaveCount(0);
});

test('3D lišta / Arditu: procházka – Shift+F3, W jde vpřed v úrovni očí, Esc konec', async ({ page }) => {
  await page.getByTestId('canvas-3d').click({ position: { x: 5, y: 5 } });
  await page.keyboard.press('Shift+F3');
  await expect.poll(async () => (await scene(page)).walking).toBe(true);
  const e0 = (await scene(page)).eye;
  expect(e0[2]).toBeCloseTo(1.6, 2);
  await page.keyboard.down('w');
  await page.waitForTimeout(400);
  await page.keyboard.up('w');
  const e1 = (await scene(page)).eye;
  expect(Math.hypot(e1[0]! - e0[0]!, e1[1]! - e0[1]!)).toBeGreaterThan(0.2);
  expect(e1[2]).toBeCloseTo(1.6, 2);
  // W během procházky nespustí nástroj stěny v půdorysu.
  expect(await page.evaluate(() => window.__bim!.tool())).toBe('select');
  await page.keyboard.press('Escape');
  await expect.poll(async () => (await scene(page)).walking).toBe(false);
});
