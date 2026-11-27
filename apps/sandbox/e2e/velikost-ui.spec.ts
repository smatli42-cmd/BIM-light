// Prohlížečové testy: velikost rozhraní (pokyn uživatele 2026-11-27, hůř vidí). Volba vedle motivu
// zvětší písmo, ikony i panely, zapamatuje se; výkres (měřítko pohledu) se nemění.
import { expect, test, type Page } from '@playwright/test';
import { open } from './helpers.ts';

const fontPx = (page: Page) =>
  page.getByTestId('infobox').evaluate((e) => parseFloat(getComputedStyle(e).fontSize));
const iconPx = async (page: Page) =>
  (await page.getByTestId('undo').locator('svg').boundingBox())?.width ?? 0;

test('velikost-ui / výchozí Střední: písmo panelů aspoň 15 px a ikony aspoň 22 px (úroveň Arditu)', async ({
  page,
}) => {
  await open(page);
  await expect(page.getByTestId('ui-size')).toHaveValue('medium');
  expect(await fontPx(page)).toBeGreaterThanOrEqual(15);
  expect(await iconPx(page)).toBeGreaterThanOrEqual(22);
});

test('velikost-ui / Největší zvětší písmo i ikony, zapamatuje se po obnovení stránky', async ({ page }) => {
  await open(page);
  const font = await fontPx(page);
  const icon = await iconPx(page);
  const zoom = await page.evaluate(() => window.__bim!.toPage(1000, 0).x - window.__bim!.toPage(0, 0).x);
  await page.getByTestId('ui-size').selectOption('xlarge');
  expect(await fontPx(page)).toBeCloseTo(font * 1.3, 0);
  expect(await iconPx(page)).toBeCloseTo(icon * 1.3, 0);
  // Výkres se nemění: 1000 mm modelu je pořád stejně px.
  expect(
    await page.evaluate(() => window.__bim!.toPage(1000, 0).x - window.__bim!.toPage(0, 0).x),
  ).toBeCloseTo(zoom, 3);
  await page.reload();
  await expect(page.getByTestId('ui-size')).toHaveValue('xlarge');
  expect(await fontPx(page)).toBeCloseTo(font * 1.3, 0);
  await page.getByTestId('ui-size').selectOption('small');
  expect(await fontPx(page)).toBeCloseTo(font * 0.85, 0);
});

test('velikost-ui / úzké okno 1280 px s Největší: lišty a panely nepřetečou mimo okno', async ({ page }) => {
  await open(page);
  await page.getByTestId('ui-size').selectOption('xlarge');
  await page.setViewportSize({ width: 1280, height: 800 });
  // Výpis přetékajících prvků (značka, třída, test id), aby chyba v CI (jiná písma) řekla, co přeteklo.
  const out = await page.evaluate(() =>
    [...document.querySelectorAll('.appbar *, .commandbar *, .bottombar *, .panel *, .palette *')]
      .filter((e) => {
        const r = e.getBoundingClientRect();
        return r.width > 0 && (r.right > innerWidth + 0.5 || r.left < -0.5);
      })
      .map((e) => `${e.tagName}.${e.getAttribute('class') ?? ''} [${e.getAttribute('data-testid') ?? ''}]`),
  );
  expect(out).toEqual([]);
  const canvas = await page.getByTestId('drawing-canvas').boundingBox();
  expect(canvas?.width ?? 0).toBeGreaterThan(400);
});

test('velikost-ui / Ctrl + a Ctrl − přibližují jen výkres, velikost rozhraní zůstane', async ({ page }) => {
  await open(page);
  const span = () => page.evaluate(() => window.__bim!.toPage(1000, 0).x - window.__bim!.toPage(0, 0).x);
  const font = await fontPx(page);
  const before = await span();
  await page.keyboard.press('Control+=');
  expect(await span()).toBeCloseTo(before * 1.25, 1);
  await page.keyboard.press('Control+-');
  expect(await span()).toBeCloseTo(before, 1);
  expect(await fontPx(page)).toBe(font);
});
