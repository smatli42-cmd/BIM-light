// Prohlížečové testy: vlastnosti stěny (plán stěn Z7) – přepis v info boxu, vlastnosti typu, konstrukční
// zobrazení „jen jádro nosných“ a vlastnosti v exportu IFC.
import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { clickAt, model, open, room, wallById } from './helpers.ts';

test.beforeEach(async ({ page }) => {
  await open(page);
});

test.describe('plan-steny / Z7: vlastnosti stěny v sandboxu', () => {
  test('plan-steny / Z7: info box – přepis nosnosti u stěny a návrat k typu', async ({ page }) => {
    const [left] = await room(page);
    await clickAt(page, -150, 1500);
    const field = page.getByTestId('prop-loadBearing');
    await expect(field.locator('option:checked')).toHaveText('podle typu (ano)');
    await field.selectOption('false');
    expect((await wallById(page, left)).properties).toEqual({ loadBearing: false });
    await expect(page.getByTestId('props-summary')).toContainText('nenosná');
    await page.getByTestId('prop-fireRating').fill('EI 30');
    await page.getByTestId('prop-fireRating').press('Enter');
    expect((await wallById(page, left)).properties).toMatchObject({ fireRating: 'EI 30' });
    await field.selectOption('__type');
    expect((await wallById(page, left)).properties).toEqual({ fireRating: 'EI 30' });
  });

  test('plan-steny / Z7: záložka Typ – funkce typu platí pro všechny stěny typu', async ({ page }) => {
    await room(page);
    await clickAt(page, -150, 1500);
    await page.getByTestId('ib-type').click();
    await page.getByTestId('type-prop-function').selectOption('exterior');
    const m = await model(page);
    const type = Object.values(m.wallTypes).find((t) => t.name === 'Zdivo 300')!;
    expect(type.properties.function).toBe('exterior');
    await page.getByTestId('ib-instance').click();
    await expect(page.getByTestId('prop-function').locator('option:checked')).toHaveText(
      'podle typu (Obvodová)',
    );
  });

  test('plan-steny / Z7: spodní lišta – jen jádro nosných', async ({ page }) => {
    await page.getByTestId('structure-menu').click();
    await page.getByTestId('structure-bearing-core').click();
    await expect(page.getByTestId('structure-menu')).toContainText('Jen jádro nosných');
  });

  test('plan-steny / Z7: export IFC nese Pset_WallCommon s nosností a požární odolností', async ({
    page,
  }) => {
    const [left] = await room(page);
    await clickAt(page, -150, 1500);
    await page.getByTestId('prop-fireRating').fill('REI 60');
    await page.getByTestId('prop-fireRating').press('Enter');
    expect((await wallById(page, left)).properties).toEqual({ fireRating: 'REI 60' });
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByTestId('export-ifc').click(),
    ]);
    const text = readFileSync((await download.path())!, 'utf8');
    expect(text).toContain("'Pset_WallCommon'");
    expect(text).toContain("IFCPROPERTYSINGLEVALUE('LoadBearing',$,IFCBOOLEAN(.T.),$)");
    expect(text).toContain("IFCPROPERTYSINGLEVALUE('FireRating',$,IFCLABEL('REI 60'),$)");
  });
});
