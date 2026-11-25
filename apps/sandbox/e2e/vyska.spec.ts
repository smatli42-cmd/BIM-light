import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { clickAt, model, open, room, run, wall } from './helpers.ts';

test.beforeEach(async ({ page }) => {
  await open(page);
});

test.describe('plan-steny / Z3: výška stěny, podlaží a export IFC v sandboxu', () => {
  test('plan-steny / Z3: změna výšky 1.NP v záložce Podlaží změní výšku vybrané stěny', async ({ page }) => {
    await wall(page, { x: 0, y: 0 }, { x: 4000, y: 0 });
    await clickAt(page, 2000, 150);
    await expect(page.getByTestId('h-result')).toContainText('Výška 3000 mm');
    await page.getByTestId('tab-contents').click();
    await page.getByTestId('storey-height-0').fill('3100');
    await page.getByTestId('storey-height-0').press('Enter');
    await expect(page.getByTestId('h-result')).toContainText('Výška 3100 mm');
  });

  test('plan-steny / Z3: vršek přes dvě podlaží a odsazení v panelu Vlastnosti', async ({ page }) => {
    await page.getByTestId('tab-contents').click();
    await page.getByTestId('storey-add').click();
    await expect(page.getByTestId('storey-1')).toContainText('2.NP');
    await page.getByTestId('storey-open-0').click();
    const id = await wall(page, { x: 0, y: 0 }, { x: 4000, y: 0 });
    await clickAt(page, 2000, 150);
    await page.getByTestId('h-top-kind').selectOption('2');
    await page.getByTestId('h-top-offset').fill('-250');
    await page.getByTestId('h-top-offset').press('Enter');
    await expect(page.getByTestId('h-result')).toContainText('Výška 5750 mm');
    const m = await model(page);
    expect(m.elements[id]!.height.top).toEqual({ kind: 'storey', storeys: 2, offset: -250 });
  });

  test('plan-steny / Z3: smazání podlaží se stěnou se odmítne s počtem prvků', async ({ page }) => {
    await room(page);
    await page.getByTestId('tab-contents').click();
    await page.getByTestId('storey-add').click();
    await page.getByTestId('storey-delete-0').click();
    await expect(page.getByText(/4 prvků/)).toBeVisible();
    expect(Object.keys((await model(page)).storeys)).toHaveLength(2);
  });

  test('plan-steny / Z3: Exportovat IFC stáhne soubor se stěnami a skladbou', async ({ page }) => {
    await room(page);
    await run(page, 'storey.update', {
      storeyId: Object.keys((await model(page)).storeys)[0],
      name: 'Přízemí',
    });
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByTestId('export-ifc').click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/\.ifc$/);
    const text = readFileSync((await download.path())!, 'utf8');
    expect(text).toMatch(/^ISO-10303-21;/);
    expect(text.match(/=IFCWALL\(/g)).toHaveLength(4);
    expect(text).toContain('IFCMATERIALLAYERSETUSAGE');
    expect(text).toContain("'P\\X2\\0159\\X0\\\\X2\\00ED\\X0\\zem\\X2\\00ED\\X0\\'");
  });
});
