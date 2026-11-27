// Prohlížečové testy vazby desky (základy 14, 16, 24): podlaha klikem do místnosti, stav vazby v info boxu,
// ruční úprava vazbu zamkne a „Obnovit vazbu“ obrys znovu spočítá ze stěn.
import { expect, test, type Page } from '@playwright/test';
import { allSlabs, type Model } from '@bim-light/core';
import { clickAt, dragPx, model, open, px, room, selection } from './helpers.ts';

test.beforeEach(async ({ page }) => {
  await open(page);
});

const slabs = async (page: Page) => allSlabs((await model(page)) as unknown as Model);
const maxX = (o: readonly { x: number }[]) => Math.round(Math.max(...o.map((p) => p.x)));

test.describe('vazba desky v sandboxu', () => {
  test('desky – vazba 7: S → Podle místnosti, klik do místnosti = podlaha vázaná na místnost', async ({
    page,
  }) => {
    await room(page);
    await page.evaluate(() => {
      const h = window.__bim!;
      h.run('room.create', { storeyId: h.storeyId(), point: { x: 2000, y: 1500 } });
    });
    await page.keyboard.press('s');
    await page.getByTestId('slab-method-room').click();
    await clickAt(page, 1000, 1000);
    await expect.poll(async () => (await slabs(page)).length).toBe(1);
    const [s] = await slabs(page);
    expect([s!.slabFunction, s!.link?.kind, maxX(s!.outline)]).toEqual(['floor', 'room', 4000]);
  });

  test('desky – vazba 7: info box – vázáno na stěny, ruční úprava zamkne, Obnovit vazbu', async ({
    page,
  }) => {
    const walls = await room(page);
    await page.evaluate((wallIds) => {
      const h = window.__bim!;
      const typeId = Object.values(h.model().slabTypes).find((t) => t.name === 'ŽB strop 250')!.id;
      h.run('slab.create', { storeyId: h.storeyId(), typeId, walls: { wallIds } });
    }, walls);
    await clickAt(page, 2000, 1500);
    expect((await selection(page)).slabs).toHaveLength(1);
    await expect(page.getByTestId('slab-link')).toHaveText('vázáno na stěny (4, líc)');
    await dragPx(page, await px(page, 4000, 3000), await px(page, 5000, 3000));
    await expect(page.getByTestId('slab-link')).toContainText('zamčeno');
    expect(maxX((await slabs(page))[0]!.outline)).toBe(5000);
    await page.getByTestId('slab-restore-link').click();
    await expect(page.getByTestId('slab-link')).toHaveText('vázáno na stěny (4, líc)');
    expect(maxX((await slabs(page))[0]!.outline)).toBe(4000);
  });
});
