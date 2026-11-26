// Prohlížečové testy: značka typu stěny v půdorysu (plán stěn Z8) – zapnutí u vybrané stěny, strana,
// Označit všechny stěny a kresba kroužku se značkou.
import { expect, test } from '@playwright/test';
import { clickAt, model, open, room } from './helpers.ts';

test.beforeEach(async ({ page }) => {
  await open(page);
});

test.describe('plan-steny / Z8: značky typu v sandboxu', () => {
  test('plan-steny / Z8: info box – značka typu u vybrané stěny a změna strany', async ({ page }) => {
    const [left] = await room(page);
    await clickAt(page, -150, 1500);
    await page.getByTestId('wall-tag-on').check();
    const tags = Object.values((await model(page)).wallTags);
    expect(tags.map((t) => t.wallId)).toEqual([left]);
    await page.getByTestId('wall-tag-side').selectOption('opp');
    expect(Object.values((await model(page)).wallTags)[0]?.side).toBe('opp');
    await page.getByTestId('wall-tag-on').uncheck();
    expect((await model(page)).wallTags).toEqual({});
  });

  test('plan-steny / Z8: Označit všechny stěny a kresba se značkou typu', async ({ page }) => {
    await room(page);
    await page.keyboard.press('Escape');
    await page.getByTestId('tag-all').click();
    expect(Object.keys((await model(page)).wallTags)).toHaveLength(4);
    const marks = await page.evaluate(() => {
      const h = window.__bim!;
      const m = h.model();
      return Object.values(m.wallTags).map((t) => m.wallTypes[m.elements[t.wallId]!.typeId]?.mark);
    });
    expect(marks).toEqual(['S1', 'S1', 'S1', 'S1']);
  });
});
