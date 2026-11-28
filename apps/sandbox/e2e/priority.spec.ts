// Prohlížečové testy: okno Nastavení → Priority spojování (pokyn uživatele 2026-11-28, scéna
// ?ukazka=priority-spojovani). Posun úrovně změní roh stěn, materiál jde přesunout do jiné úrovně.
import { expect, test, type Page } from '@playwright/test';

const levels = (page: Page) => page.getByTestId('jp-level');
const level = (page: Page, name: string) => page.locator(`[data-testid=jp-level][data-name="${name}"]`);
const names = (page: Page) =>
  levels(page).evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset['name']));

/** Plochy vrstev všech stěn (otisk tvaru spojů ve výkresu). */
const corners = (page: Page) =>
  page.evaluate(() => {
    const m = window.__bim!.model();
    return Object.keys(m.elements)
      .filter((id) => m.elements[id]?.category === 'wall')
      .map(
        (wallId) => (window.__bim!.query('wall.get', { wallId }) as { layers: { area: number }[] }).layers,
      );
  });

async function openPriorities(page: Page) {
  await page.goto('./?ukazka=priority-spojovani');
  await page.waitForFunction(() => Object.keys(window.__bim?.model().elements ?? {}).length > 5);
  await page.getByTestId('settings-open').click();
  await page.getByTestId('settings-priorities').click();
  await expect(page.getByTestId('priorities-dialog')).toBeVisible();
}

test.describe('priority spojování', () => {
  test('Tepelná izolace nad Zdivo: roh se změní ve výkresu i v náhledu, ukáže se podezřelé místo, Ctrl+Z vrátí', async ({
    page,
  }) => {
    await openPriorities(page);
    const before = await corners(page);
    const sig = await page.getByTestId('jp-detail').getAttribute('data-sig');
    await expect(page.getByTestId('jp-issue')).toHaveCount(0);
    for (let i = 0; i < 4; i++) await level(page, 'Tepelná izolace').getByTestId('jp-up').click();
    const order = await names(page);
    expect(order.indexOf('Tepelná izolace')).toBeLessThan(order.indexOf('Zdivo'));
    expect(await corners(page)).not.toEqual(before);
    await expect(page.getByTestId('jp-detail')).not.toHaveAttribute('data-sig', sig ?? '');
    await expect(page.getByTestId('jp-issue').first()).toContainText('Tepelná izolace EPS');
    await page.getByTestId('priorities-dialog').click({ position: { x: 5, y: 5 } });
    for (let i = 0; i < 4; i++) await page.keyboard.press('Control+z');
    expect(await corners(page)).toEqual(before);
  });

  test('tažení úrovně a přesun materiálu do jiné úrovně (volbou i tažením), nová a smazaná úroveň', async ({
    page,
  }) => {
    await openPriorities(page);
    await level(page, 'Tepelná izolace').getByTestId('jp-grip').dragTo(level(page, 'Zdivo'));
    const order = await names(page);
    expect(order.indexOf('Tepelná izolace')).toBeLessThan(order.indexOf('Zdivo'));

    const eps = level(page, 'Tepelná izolace').locator(
      '[data-testid=jp-material][data-name="Tepelná izolace EPS"]',
    );
    await eps.getByTestId('jp-material-level').selectOption({ label: 'Hydroizolace a fólie' });
    await expect(level(page, 'Hydroizolace a fólie')).toContainText('Tepelná izolace EPS');
    await expect(level(page, 'Tepelná izolace')).not.toContainText('Tepelná izolace EPS');

    const wool = page.locator('[data-testid=jp-material][data-name="Minerální vata"]');
    await wool.getByTestId('jp-material-handle').dragTo(level(page, 'Dřevo a dřevěné konstrukce'));
    await expect(level(page, 'Dřevo a dřevěné konstrukce')).toContainText('Minerální vata');

    await page.getByTestId('jp-new-name').fill('Kotvy a spojky');
    await page.getByTestId('jp-add').click();
    await expect(levels(page).last()).toHaveAttribute('data-name', 'Kotvy a spojky');
    await level(page, 'Kotvy a spojky').getByTitle('Smazat prázdnou úroveň').click();
    await expect(level(page, 'Kotvy a spojky')).toHaveCount(0);
  });

  test('panel Materiály: volba úrovně materiálu a odkaz na okno priorit', async ({ page }) => {
    await page.goto('./?ukazka=priority-spojovani');
    await page.getByTestId('tab-materials').click();
    await page.getByTestId('material-search').fill('Beton prostý');
    await page.getByTestId('material-row').first().click();
    await page.getByTestId('material-join-level').selectOption({ label: 'Nosný železobeton' });
    const lv = await page.evaluate(() => {
      const m = window.__bim!.model();
      return Object.values(m.materials).find((x) => x.name === 'Beton prostý')?.joinLevelId;
    });
    expect(lv).toBe('join-rc');
    await page.getByTestId('material-priorities').click();
    await expect(level(page, 'Nosný železobeton')).toContainText('Beton prostý');
  });
});
