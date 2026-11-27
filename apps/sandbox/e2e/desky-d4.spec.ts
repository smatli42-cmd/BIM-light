// Prohlížečové testy desky D4: vršek stěny k desce v info boxu, Výkaz desek v Obsahu, Kóta k hranám desky.
import { expect, test, type Page } from '@playwright/test';
import { clickAt, dims, model, open, wall } from './helpers.ts';

test.beforeEach(async ({ page }) => {
  await open(page);
});

/** Deska typu `name` jako obdélník příkazem; `storeyId` chybí = aktivní podlaží. */
async function slab(page: Page, name: string, a: [number, number], b: [number, number], storeyId?: string) {
  return page.evaluate(
    ({ name, a, b, storeyId }) => {
      const h = window.__bim!;
      const typeId = Object.values(h.model().slabTypes).find((t) => t.name === name)!.id;
      const rect = { a: { x: a[0], y: a[1] }, b: { x: b[0], y: b[1] } };
      return h.run('slab.create', { storeyId: storeyId ?? h.storeyId(), typeId, rect })[0]!;
    },
    { name, a, b, storeyId },
  );
}

const run = (page: Page, name: string, params: unknown) =>
  page.evaluate(({ name, params }) => window.__bim!.run(name, params), { name, params });

test.describe('desky D4 v sandboxu', () => {
  test('desky D4: info box stěny – Vršek k desce; změna desky výšku přepočítá', async ({ page }) => {
    const [s2] = await run(page, 'storey.create', { name: '2.NP', elevation: 3000, height: 3000 });
    const rc = await slab(page, 'ŽB strop 250', [-1000, -1000], [6000, 4000], s2);
    const id = await wall(page, { x: 0, y: 0 }, { x: 4000, y: 0 });
    await clickAt(page, 2000, 150);
    await page.getByTestId('h-top-kind').selectOption('slab');
    await expect(page.getByTestId('h-result')).toContainText('Výška 2590 mm');
    await expect(page.getByTestId('h-result')).toContainText('ŽB strop 250');
    expect((await model(page)).elements[id]!.height.top).toEqual({ kind: 'slab', slabId: rc, offset: 0 });
    await run(page, 'slab.update', { slabIds: [rc], topOffset: -300 });
    await clickAt(page, 2000, 150);
    await expect(page.getByTestId('h-result')).toContainText('Výška 2440 mm');
  });

  test('desky D4: Obsah → Projekt → Výkazy → Výkaz desek', async ({ page }) => {
    await slab(page, 'ŽB strop 250', [0, 0], [4000, 3000]);
    await slab(page, 'Podlaha anhydrit 150', [0, 0], [4000, 3000]);
    await page.getByTestId('ct-project').click();
    await page.getByTestId('open-schedule-Výkaz desek').click();
    await expect(page.getByTestId('schedule-dialog')).toBeVisible();
    // sloupce: značka, typ, podlaží, tloušťka, počet, plocha, bez otvorů, obvod, objem
    const total = page.getByTestId('schedule-row-total').locator('td');
    await expect(total.nth(4)).toHaveText('2');
    await expect(total.nth(5)).toHaveText('24,00');
  });

  test('desky D4: nástroj Kóta – hrana a roh desky dají kótu vzdálenosti', async ({ page }) => {
    const id = await slab(page, 'ŽB strop 250', [0, 0], [4000, 3000]);
    await page.keyboard.press('d');
    await clickAt(page, 2000, 0);
    await clickAt(page, 2000, 3000);
    await clickAt(page, 5500, 1500);
    await expect.poll(async () => (await dims(page)).length).toBe(1);
    const [d] = await dims(page);
    expect(d?.kind === 'linear' && d.refs.every((r) => 'outline' in r && r.ownerId === id)).toBe(true);
    await page.keyboard.press('d');
    await clickAt(page, 4000, 3000);
    await clickAt(page, 0, 1500);
    await clickAt(page, 2000, 5000);
    await expect.poll(async () => (await dims(page)).length).toBe(2);
  });
});
