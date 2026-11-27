// Prohlížečové testy řezů a pohledů (rozhodnutí 19): okno řezu z Obsahu → Projekt ukáže kresbu z modelu,
// kresba se přepočítá po změně modelu, Esc okno zavře.
import { expect, test, type Page } from '@playwright/test';
import { model } from './helpers.ts';

const count = async (page: Page, key: 'primitives' | 'hatches') =>
  Number(await page.getByTestId('section-canvas').getAttribute(`data-${key}`));

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1700, height: 1000 });
  await page.goto('./?ukazka=rezy');
  await page.waitForFunction(() => !!window.__bim);
});

test('rozhodnutí 19: Obsah → Projekt → Řezy → Řez A otevře okno s řezem po vrstvách se šrafami', async ({
  page,
}) => {
  await page.getByTestId('open-section-Řez A').click();
  await expect(page.getByTestId('section-title')).toHaveText('Řez A');
  await expect.poll(() => count(page, 'hatches')).toBeGreaterThan(10);
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('section-dialog')).toHaveCount(0);
});

test('rozhodnutí 19: pohled (fasáda) bez šraf; smazání stěny řez přepočítá', async ({ page }) => {
  await page.getByTestId('open-section-Pohled jižní').click();
  await expect.poll(() => count(page, 'primitives')).toBeGreaterThan(10);
  expect(await count(page, 'hatches')).toBe(0);
  await page.keyboard.press('Escape');
  await page.getByTestId('open-section-Řez A').click();
  await expect.poll(() => count(page, 'hatches')).toBeGreaterThan(10);
  const before = await count(page, 'primitives');
  const m = await model(page);
  const walls = Object.values(m.elements).filter((e) => e.category === 'wall');
  await page.evaluate(
    (ids) => window.__bim!.run('selection.delete', { wallIds: ids }),
    walls.map((w) => w.id),
  );
  await expect.poll(() => count(page, 'primitives')).toBeLessThan(before);
});
