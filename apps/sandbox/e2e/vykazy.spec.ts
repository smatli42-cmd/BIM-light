// Prohlížečové testy: výkazy a legenda skladeb (plán stěn Z8, základ 8) – okno výkazu v Obsahu,
// přepočet po změně modelu, nastavení, nový výkaz a export CSV.
import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { clickAt, model, open, room, run } from './helpers.ts';

test.beforeEach(async ({ page }) => {
  await open(page);
});

const totalRow = (page: import('@playwright/test').Page) =>
  page.getByTestId('schedule-row-total').locator('td');

test.describe('plan-steny / Z8: výkazy v sandboxu', () => {
  test('plan-steny / Z8: Výkaz stěn – místnost 4 × 3 m: 4 stěny, osa 15,20 m; přepočet po otvoru', async ({
    page,
  }) => {
    const [left] = await room(page);
    await page.getByTestId('ct-project').click();
    await page.getByTestId('open-schedule-Výkaz stěn').click();
    await expect(page.getByTestId('schedule-dialog')).toBeVisible();
    // sloupce: značka, typ, tloušťka, počet, délka, hrubá, otvory, čistá, objem
    await expect(totalRow(page).nth(3)).toHaveText('4');
    await expect(totalRow(page).nth(4)).toHaveText('15,20');
    await run(page, 'opening.create', { wallId: left, offset: 500, width: 1000, height: 2000 });
    await expect(totalRow(page).nth(6)).toHaveText('2,00');
  });

  test('plan-steny / Z8: nastavení – po prvcích a sloupec Stav; filtr stavu', async ({ page }) => {
    await room(page);
    await page.getByTestId('ct-project').click();
    await page.getByTestId('open-schedule-Výkaz stěn').click();
    await page.getByTestId('schedule-itemize').check();
    await expect(page.getByTestId('schedule-row-item')).toHaveCount(4);
    await page.getByTestId('schedule-field-status').check();
    const def = (await model(page)).schedules['schedule-walls']!;
    expect(def.fields).toContain('status');
    await page.getByTestId('schedule-status-existing').check();
    await expect(page.getByTestId('schedule-dialog')).toContainText('Výkaz je prázdný');
  });

  test('plan-steny / Z8: nový výkaz legendy a export CSV', async ({ page }) => {
    await room(page);
    await page.getByTestId('ct-project').click();
    await page.getByTestId('schedule-source').selectOption('wall-types');
    await page.getByTestId('schedule-new').click();
    await expect(page.getByTestId('schedule-title')).toHaveText('Nový výkaz');
    await expect(page.getByTestId('schedule-table')).toContainText('Zdivo 300');
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByTestId('schedule-csv').click(),
    ]);
    expect(download.suggestedFilename()).toBe('Nový výkaz.csv');
    const text = readFileSync((await download.path())!, 'utf8');
    expect(text).toContain('Značka;Typ;Tloušťka (mm);Skladba');
    expect(text).toContain('S1;Zdivo 300;300');
  });

  test('plan-steny / Z8: značka typu v záložce Typ', async ({ page }) => {
    await room(page);
    await clickAt(page, -150, 1500);
    await page.getByTestId('ib-type').click();
    await page.getByTestId('type-mark').fill('Z1');
    await page.getByTestId('type-mark').press('Enter');
    const t = Object.values((await model(page)).wallTypes).find((x) => x.name === 'Zdivo 300')!;
    expect(t.mark).toBe('Z1');
  });
});
