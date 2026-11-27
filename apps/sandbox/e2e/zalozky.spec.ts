// Prohlížečové testy záložek pohledů v záhlaví okna (pokyn uživatele 2026-11-27, princip Arditu): otevření
// pohledu přidá záložku, už otevřený se jen přepne, klik přepne okno, × zavře, dvě okna mají svoje záložky,
// 3D okno převezme záložky okna, které nahradilo. Výkaz se otevírá do okna (dříve dialog).
import { expect, test, type Page } from '@playwright/test';
import { open } from './helpers.ts';

const tabs = (page: Page, suffix = '') => page.getByTestId(`window-tabs${suffix}`).getByRole('tab');

test.beforeEach(async ({ page }) => {
  await open(page);
  await page.getByTestId('ct-project').click();
});

test('koncepce-rozhrani / záložky: otevření přidá záložku, bez duplicit, klik přepne, × zavře', async ({
  page,
}) => {
  await expect(tabs(page)).toHaveCount(1);
  await page.getByTestId('open-schedule-Výkaz stěn').click();
  await expect(page.getByTestId('schedule-dialog')).toBeVisible();
  await expect(tabs(page)).toHaveText(['1.NP', 'Výkaz stěn']);
  await page.getByTestId('tab-1.NP').click();
  await expect(page.getByTestId('drawing-canvas')).toBeVisible();
  await page.getByTestId('open-schedule-Výkaz stěn').click();
  await expect(tabs(page)).toHaveCount(2);
  await expect(page.getByTestId('tab-Výkaz stěn')).toHaveAttribute('aria-selected', 'true');
  // Zavření aktivní záložky přepne na sousední; poslední záložka × nemá.
  await page.getByTestId('tab-close-Výkaz stěn').click();
  await expect(tabs(page)).toHaveText(['1.NP']);
  await expect(page.getByTestId('drawing-canvas')).toBeVisible();
  await expect(page.getByTestId('tab-close-1.NP')).toHaveCount(0);
});

test('koncepce-rozhrani / záložky: dvě okna mají každé své záložky', async ({ page }) => {
  await page.getByTestId('layout-2').click();
  await page.getByTestId('drawing-canvas-passive').click({ position: { x: 200, y: 200 } });
  await page.getByTestId('open-schedule-Legenda skladeb').click();
  await expect(tabs(page)).toHaveText(['1.NP', 'Legenda skladeb']);
  await expect(tabs(page, '-passive')).toHaveText(['1.NP']);
});

test('koncepce-rozhrani / záložky: 3D převezme záložky okna, záložka 1.NP vrátí půdorys', async ({
  page,
}) => {
  await page.getByTestId('open-schedule-Výkaz stěn').click();
  await page.getByTestId('open-3d-3D').click();
  await expect(tabs(page, '-3d')).toHaveText(['1.NP', 'Výkaz stěn', '3D']);
  await page.getByTestId('tab-3d-1.NP').click();
  await expect(page.getByTestId('window-3d')).toHaveCount(0);
  await expect(page.getByTestId('drawing-canvas')).toBeVisible();
  await expect(tabs(page)).toHaveText(['1.NP', 'Výkaz stěn', '3D']);
});
