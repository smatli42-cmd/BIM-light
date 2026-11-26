// Prohlížečové testy: rekonstrukce podle příkladu uživatele (2026-11-26) – čtyři stávající stěny, příčka
// k bourání a nová příčka; filtr rekonstrukce v liště i v Nastavení pohledu (vzor Arditu / Archicadu).
import { expect, test } from '@playwright/test';
import { clickAt, model, open, walls } from './helpers.ts';

test.beforeEach(async ({ page }) => {
  await open(page);
});

test('pokyn uživatele 2026-11-26: zaměření jako stávající, bourání příčky, nová příčka, výkres Bourací práce', async ({
  page,
}) => {
  await page.keyboard.press('w');
  await page.getByTestId('new-status').selectOption('existing');
  for (const [x, y] of [
    [0, 0],
    [0, 4000],
    [6000, 4000],
    [6000, 0],
    [0, 0],
  ] as const)
    await clickAt(page, x, y);
  await page.keyboard.press('Escape');
  await page.keyboard.press('w');
  await clickAt(page, 3000, 0);
  await clickAt(page, 3000, 4000);
  await page.keyboard.press('Escape');
  const before = await walls(page);
  expect(before.length).toBe(5);
  expect(before.every((w) => w.status === 'existing')).toBe(true);
  await page.keyboard.press('w');
  await page.getByTestId('new-status').selectOption('new');
  await clickAt(page, 0, 2000);
  await clickAt(page, 3000, 2000);
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
  const partition = before.find(
    (w) => Math.abs(w.path.start.x - 3000) < 1 && Math.abs(w.path.end.x - 3000) < 1,
  )!;
  await clickAt(page, 3000 + (partition.path.end.y > 0 ? -150 : 150), 1000);
  await page.getByTestId('sel-status').selectOption('demolished');
  const all = await walls(page);
  expect(all.filter((w) => w.status === 'new').length).toBeGreaterThanOrEqual(1);
  expect(all.find((w) => w.id === partition.id)?.status).toBe('demolished');
  await page.getByTestId('phase-menu').click();
  await page.getByTestId('phase-Bourací práce').click();
  const view = Object.values((await model(page)).views).find((v) => !v.saved)!;
  const filter = (await model(page)).display.overrideCombinations[view.phaseFilterId!];
  expect(filter?.name).toBe('Fáze – bourací práce');
  await page.getByTestId('ct-views').click();
  await page.getByTestId('view-save').click();
  await expect(page.getByTestId('vs-phase').locator('option:checked')).toHaveText('Bourací práce');
  await page.getByTestId('vs-phase').selectOption({ label: 'Plánovaný stav' });
  const saved = Object.values((await model(page)).views).find((v) => v.saved)!;
  expect((await model(page)).display.overrideCombinations[saved.phaseFilterId!]?.name).toBe(
    'Fáze – plánovaný stav',
  );
});
