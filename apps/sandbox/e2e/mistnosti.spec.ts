// Prohlížečové testy místností (prvky stavby 9): nástroj Místnost (N), výběr klikem, info box s plochou,
// úprava názvu, tažení razítka, smazání, Výpis místností v Obsahu.
import { expect, test } from '@playwright/test';
import { clickAt, dragPx, model, open, px, room, selection } from './helpers.ts';

test.beforeEach(async ({ page }) => {
  await open(page);
});

test.describe('místnosti v sandboxu', () => {
  test('prvky stavby 9: N → klik dovnitř vloží místnost s plochou z líců stěn', async ({ page }) => {
    await room(page);
    await page.keyboard.press('n');
    await clickAt(page, 2000, 1500);
    await expect.poll(async () => Object.keys((await model(page)).rooms).length).toBe(1);
    const r = Object.values((await model(page)).rooms)[0]!;
    expect([r.number, r.seed]).toEqual(['1.01', { x: 2000, y: 1500 }]);
  });

  test('prvky stavby 9: výběr klikem, info box (plocha jen ke čtení), název, razítko, Del', async ({
    page,
  }) => {
    await room(page);
    await page.keyboard.press('n');
    await clickAt(page, 2000, 1500);
    await page.keyboard.press('Escape');
    await clickAt(page, 1000, 800);
    await expect.poll(async () => (await selection(page)).rooms.length).toBe(1);
    await expect(page.getByTestId('room-area')).toHaveText('12,00 m²');
    await page.getByTestId('room-name').fill('Kuchyně');
    await page.getByTestId('room-name').press('Enter');
    await expect.poll(async () => Object.values((await model(page)).rooms)[0]!.name).toBe('Kuchyně');
    // Tažení razítka posune jen razítko.
    await dragPx(page, await px(page, 2000, 1500), await px(page, 1000, 2000));
    const r = Object.values((await model(page)).rooms)[0]!;
    expect(r.stampAt).toEqual({ x: 1000, y: 2000 });
    expect(r.seed).toEqual({ x: 2000, y: 1500 });
    await page.keyboard.press('Delete');
    await expect.poll(async () => Object.keys((await model(page)).rooms).length).toBe(0);
  });

  test('prvky stavby 9: Obsah → Projekt → Výkazy → Výpis místností', async ({ page }) => {
    await room(page);
    await page.keyboard.press('n');
    await clickAt(page, 2000, 1500);
    await page.getByTestId('ct-project').click();
    await page.getByTestId('open-schedule-Výpis místností').click();
    await expect(page.getByTestId('schedule-dialog')).toBeVisible();
    await expect(page.getByTestId('schedule-dialog')).toContainText('12,00');
  });

  test('prvky stavby 9: info box – kategorie, vlastnosti a razítko stylu (zapnout, pořadí)', async ({
    page,
  }) => {
    await room(page);
    await page.keyboard.press('n');
    await clickAt(page, 2000, 1500);
    await page.keyboard.press('Escape');
    await clickAt(page, 1000, 800);
    const cats = Object.values((await model(page)).roomCategories);
    const obytne = cats.find((c) => c.name === 'Obytné')!;
    await page.getByTestId('room-category').selectOption(obytne.id);
    await page.getByTestId('room-occupants').fill('3');
    await page.getByTestId('room-occupants').press('Enter');
    await page.getByTestId('room-floorFinish').fill('parkety');
    await page.getByTestId('room-floorFinish').press('Enter');
    await expect
      .poll(async () => Object.values((await model(page)).rooms)[0])
      .toMatchObject({ categoryId: obytne.id, props: { occupants: 3, floorFinish: 'parkety' } });
    await page.getByTestId('stamp-on-occupants').check();
    await page.getByTestId('stamp-up-occupants').click();
    const style = async () => {
      const m = await model(page);
      const v = Object.values(m.views)[0]!;
      return m.display.styles[v.styleId]!.roomStamp;
    };
    await expect.poll(style).toEqual(['number', 'name', 'occupants', 'area']);
  });
});
