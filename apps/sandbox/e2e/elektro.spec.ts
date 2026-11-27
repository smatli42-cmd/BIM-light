// Prohlížečové testy: Elektro krok 1 (koncepce 3, 4) – ukázka ?ukazka=elektro, sada Elektro v přepínači,
// značky z jádra se kreslí jen ve stylu Elektro, prvek jde se stěnou.
import { expect, test } from '@playwright/test';
import { model, run } from './helpers.ts';

interface Row {
  id: string;
  mark: string;
  position: { x: number; y: number } | null;
  host: { wallId?: string };
}

const rows = (page: import('@playwright/test').Page) =>
  page.evaluate(() => window.__bim!.query('electro.list', {})) as Promise<Row[]>;

test('elektro: ukázka otevře styl Elektro se všemi typy knihovny, přepínač sad má Studii, Projekt a Elektro', async ({
  page,
}) => {
  await page.goto('./?ukazka=elektro');
  await expect(page.getByTestId('appbar')).toContainText('Elektro – knihovna značek');
  await expect(page.getByTestId('style-state')).toContainText('styl: Elektro');
  for (const name of ['Studie', 'Projekt', 'Elektro'])
    await expect(page.getByTestId(`style-${name}`)).toBeVisible();
  const m = await model(page);
  expect(Object.keys(m.electroElements).length).toBeGreaterThan(44);
  await page.getByTestId('style-Studie').click();
  await expect(page.getByTestId('style-state')).toContainText('styl: Studie');
});

test('elektro: posun stěny příkazem posune zásuvku na ní (prvek jde se stěnou)', async ({ page }) => {
  await page.goto('./?ukazka=elektro');
  const z = (await rows(page)).find((r) => r.mark === 'Z2, D1, T1');
  expect(z?.host.wallId).toBeTruthy();
  await run(page, 'wall.move', { wallIds: [z?.host.wallId], vector: { x: 500, y: 0 } });
  const after = (await rows(page)).find((r) => r.id === z?.id);
  expect(after?.position?.x).toBeCloseTo((z?.position?.x ?? 0) + 500);
  expect(after?.position?.y).toBeCloseTo(z?.position?.y ?? 0);
});
