// Prohlížečové testy: výběr ve 3D okně nepřepíná podlaží půdorysu (hlášení uživatele 2026-11-27: „ve 3D
// klikat na vše bez přepínání pohledu“). Info box ukáže a mění prvek i z jiného podlaží. docs/STAV-3d.md.
import { expect, test } from '@playwright/test';
import type { Element } from '@bim-light/core';
import { model } from './helpers.ts';

test('3D výběr: klik na desku 2.NP – půdorys zůstane 1.NP, info box ukáže desku a změní ji', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1700, height: 1000 });
  await page.goto('./?ukazka=dum&3d');
  await expect.poll(() => page.evaluate(() => window.__bim3d?.drawn())).toBe(true);
  const m = await model(page);
  const floor1 = await page.evaluate(() => window.__bim!.storeyId());
  expect(m.storeys[floor1]!.name).toBe('1.NP');
  const s2 = Object.values(m.storeys).find((x) => x.name === '2.NP')!.id;
  // Deska 2.NP, kterou jde ve 3D trefit (podlaha nahoře zakryje strop pod ní).
  const els = Object.values(m.elements as unknown as Record<string, Element>);
  const ids = els.filter((e) => e.category === 'slab' && e.storeyId === s2).map((e) => e.id);
  const [slab, at] = await page.evaluate((list) => {
    for (const id of list) {
      const p = window.__bim3d!.hitOf(id);
      if (p) return [id, p] as const;
    }
    throw new Error('žádná deska 2.NP není ve 3D vidět');
  }, ids);
  await page.mouse.click(at.x, at.y);
  await expect.poll(() => page.evaluate(() => window.__bim!.selection().slabs)).toEqual([slab]);
  expect(await page.evaluate(() => window.__bim!.storeyId())).toBe(floor1);
  await expect(page.getByTestId('sel-slabs')).toHaveText('Vybrané desky (1)');
  // Úprava z info boxu jde příkazem i u desky jiného podlaží; výběr přežije.
  await page.getByTestId('slab-top').fill('-50');
  await page.getByTestId('slab-top').press('Enter');
  await expect
    .poll(async () => ((await model(page)).elements[slab] as unknown as { topOffset: number }).topOffset)
    .toBe(-50);
  expect(await page.evaluate(() => window.__bim!.selection().slabs)).toEqual([slab]);
  expect(await page.evaluate(() => window.__bim!.storeyId())).toBe(floor1);
});
