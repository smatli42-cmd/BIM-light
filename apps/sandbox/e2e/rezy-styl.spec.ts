// Prohlížečové testy stylu otevřeného řezu (hlášení uživatele 2026-11-27: „Když mám otevřený řez, pořád ukazuje
// styl Projekt. Když přepnu na Studii, celý výkres zmizí a okno se přepne na půdorys.“). Základ 26: přepnutí
// stylu mění jen vzhled řezu v témže okně – přepínačem sady nahoře i výběrem stylu v záhlaví okna řezu.
import { expect, test, type Page } from '@playwright/test';

const hatches = async (page: Page) =>
  Number(await page.getByTestId('section-canvas').getAttribute('data-hatches'));
const prims = async (page: Page) =>
  Number(await page.getByTestId('section-canvas').getAttribute('data-primitives'));

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1700, height: 1000 });
  await page.goto('./?ukazka=rezy');
  await page.waitForFunction(() => !!window.__bim);
  await page.getByTestId('ct-project').click();
  await page.getByTestId('open-section-Řez A').click();
  await expect(page.getByTestId('section-label')).toHaveText('Řez · Řez A · 1:100');
});

test('základ 26 / hlášení uživatele: přepínač sady Studie ↔ Projekt mění jen vzhled řezu, okno zůstane na řezu', async ({
  page,
}) => {
  await page.getByTestId('style-Studie').click();
  await expect(page.getByTestId('section-label')).toBeVisible();
  await expect(page.getByTestId('drawing-canvas')).toHaveCount(0);
  await expect(page.getByTestId('section-style')).toHaveValue(
    await page.evaluate(
      () => Object.values(window.__bim!.model().display.styles).find((x) => x.name === 'Studie')!.id,
    ),
  );
  await expect.poll(() => prims(page)).toBeGreaterThan(20);
  expect(await hatches(page)).toBe(0);
  await expect(page.getByTestId('style-Studie')).toHaveClass(/active/);
  await page.getByTestId('style-Projekt').click();
  await expect(page.getByTestId('section-label')).toBeVisible();
  await expect.poll(() => hatches(page)).toBeGreaterThan(10);
  await expect(page.getByTestId('tab-Řez A')).toHaveAttribute('aria-selected', 'true');
});

test('základ 26: výběr stylu v záhlaví okna řezu – Studie bez šraf, Projekt se šrafami, okno zůstane', async ({
  page,
}) => {
  await page.getByTestId('section-style').selectOption({ label: 'Studie' });
  await expect.poll(() => hatches(page)).toBe(0);
  expect(await prims(page)).toBeGreaterThan(20);
  await expect(page.getByTestId('style-Studie')).toHaveClass(/active/);
  await page.getByTestId('section-style').selectOption({ label: 'Projekt' });
  await expect.poll(() => hatches(page)).toBeGreaterThan(10);
  await expect(page.getByTestId('section-label')).toBeVisible();
});
