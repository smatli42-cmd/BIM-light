// Prohlížečové testy: kresba stěn v půdorysu (plán stěn Z6) – fáze ve spodní liště, stav stěny,
// „proč“ v panelu, kresba stěn ve stylu a konstrukční zobrazení.
import { expect, test } from '@playwright/test';
import { clickAt, model, open, wall, wallById } from './helpers.ts';

test.beforeEach(async ({ page }) => {
  await open(page);
});

test('plan-steny / Z6: bouraná stěna ve fázi Bourací práce – panel řekne, které pravidlo rozhodlo', async ({
  page,
}) => {
  const id = await wall(page, { x: 0, y: 0 }, { x: 0, y: 3000 });
  await clickAt(page, -150, 1500);
  await page.getByTestId('sel-status').selectOption('demolished');
  expect((await wallById(page, id)).status).toBe('demolished');
  await page.getByTestId('phase-menu').click();
  await page.getByTestId('phase-Bourací práce').click();
  await expect(page.getByTestId('phase-menu')).toContainText('Bourací práce');
  await expect(page.getByTestId('graphics-why')).toContainText('Bourání žlutě čárkovaně');
});

test('plan-steny / Z6: značka referenční čáry se zapne ve stylu; konstrukční zobrazení Jen jádro', async ({
  page,
}) => {
  await wall(page, { x: 0, y: 0 }, { x: 0, y: 3000 });
  await clickAt(page, -150, 1500);
  await page.getByTestId('style-refline').check();
  const styles = Object.values((await model(page)).display.styles);
  expect(styles.some((s) => s.categoryGraphics.wall?.refLine === true)).toBe(true);
  await page.getByTestId('structure-menu').click();
  await page.getByTestId('structure-core').click();
  await expect(page.getByTestId('structure-menu')).toContainText('Jen jádro');
});
