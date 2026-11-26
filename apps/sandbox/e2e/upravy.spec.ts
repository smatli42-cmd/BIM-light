// Prohlížečové testy: pohodlí úprav stěn (plán stěn Z9) – pipeta, výběr stejných, rozdělit s mezerou.
import { expect, test } from '@playwright/test';
import { clickAt, model, open, room, selection, wallById } from './helpers.ts';

test.beforeEach(async ({ page }) => {
  await open(page);
});

const typeId = async (page: import('@playwright/test').Page, name: string) =>
  Object.values((await model(page)).wallTypes).find((t) => t.name === name)!.id;

test.describe('plan-steny / Z9: pohodlí úprav', () => {
  test('plan-steny / Z9: pipeta – nasát vlastnosti levé stěny a přenést je na pravou', async ({ page }) => {
    const [left, , right] = await room(page);
    await clickAt(page, -150, 1500);
    await page.getByTestId('sel-type').selectOption(await typeId(page, 'ŽB stěna 200'));
    await page.getByTestId('match-pick').click();
    await clickAt(page, 4150, 1500);
    await page.getByTestId('match-apply').click();
    expect((await wallById(page, right)).typeId).toBe((await wallById(page, left)).typeId);
  });

  test('plan-steny / Z9: výběr stejných – všechny stěny stejného typu na podlaží', async ({ page }) => {
    const ids = await room(page);
    await clickAt(page, -150, 1500);
    await page.getByTestId('select-same').click();
    expect([...(await selection(page)).walls].sort()).toEqual([...ids].sort());
  });
});
