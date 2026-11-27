import { expect, test, type Page } from '@playwright/test';
import { clickAt, dims, dragPx, moveTo, open, perms, px, wall, wallById } from './helpers.ts';
import { clickLock } from './helpers.ts';

test.beforeEach(async ({ page }) => {
  await open(page);
});

/** Tři svislé stěny: líce (ref) v x = 0, 1000, 4000. */
async function three(page: Page) {
  const a = await wall(page, { x: 0, y: 0 }, { x: 0, y: 3000 });
  const b = await wall(page, { x: 1000, y: 0 }, { x: 1000, y: 3000 });
  const c = await wall(page, { x: 4000, y: 0 }, { x: 4000, y: 3000 });
  return { a, b, c };
}

/** Řada kót a–b–c nástrojem Kóta, usazená klikem do prázdna v y = 3600. */
async function chain(page: Page, y = 3600) {
  await page.keyboard.press('d');
  await clickAt(page, 0, 1500);
  await clickAt(page, 1000, 1500);
  await clickAt(page, 4000, 1500);
  await clickAt(page, 2000, y);
}

/** Řada a návrat do nástroje Výběr (Esc). */
async function chainThenSelect(page: Page) {
  await chain(page);
  await page.keyboard.press('Escape');
}

test.describe('pravidla-interakce / kóty 7: řetězová kóta jako v Revitu', () => {
  test('celá řada se nese na myši, kóty vzniknou až klikem do prázdna (jeden krok Undo)', async ({
    page,
  }) => {
    await three(page);
    await page.keyboard.press('d');
    await clickAt(page, 0, 1500);
    await clickAt(page, 1000, 1500);
    await clickAt(page, 4000, 1500);
    expect((await dims(page)).length).toBe(0);
    await moveTo(page, 2000, 3600);
    const drafts = await page.evaluate(() => window.__bim!.overlay().draftDims ?? []);
    expect(drafts.length).toBe(2);
    await moveTo(page, 2000, 4200);
    const later = await page.evaluate(() => window.__bim!.overlay().draftDims ?? []);
    expect(
      later.every(
        (d, i) => d.kind === 'linear' && drafts[i]?.kind === 'linear' && d.offset !== drafts[i].offset,
      ),
    ).toBe(true);
    await clickAt(page, 2000, 3600);
    const ds = await dims(page);
    expect(ds.length).toBe(2);
    expect(ds[0]?.alignGroupId).not.toBeNull();
    expect(ds[0]?.alignGroupId).toBe(ds[1]?.alignGroupId);
    await page.keyboard.press('Control+z');
    expect((await dims(page)).length).toBe(0);
  });

  test('klik do prázdna řadu ukončí, další klik na líc začne novou samostatnou sadu', async ({ page }) => {
    await three(page);
    await chain(page);
    await clickAt(page, 0, 1500);
    await clickAt(page, 4000, 1500);
    await clickAt(page, 2000, 900);
    const ds = await dims(page);
    expect(ds.length).toBe(3);
    const groups = new Set(ds.map((d) => d.alignGroupId));
    expect(groups.size).toBe(2);
  });

  test('Shift+klik přeskočí úsek; každý líc jen jednou; Esc řadu nechá na místě', async ({ page }) => {
    await three(page);
    await page.keyboard.press('d');
    await clickAt(page, 0, 1500);
    await clickAt(page, 1000, 1500);
    await clickAt(page, 1000, 1500);
    await expect(page.getByTestId('toast')).toContainText('jen jednou');
    await clickAt(page, -300, 1500, 'Shift');
    await moveTo(page, 2000, 3600);
    await page.keyboard.press('Escape');
    expect((await dims(page)).length).toBe(1);
  });

  test('kóty 3–4: tažení kóty ze skupiny pohne celou řadou; Alt jen jednou kótou (vyjme ji)', async ({
    page,
  }) => {
    await three(page);
    await chainThenSelect(page);
    const [p1] = await perms(page);
    await dragPx(page, p1!.line, { x: p1!.line.x, y: p1!.line.y - 50 });
    const moved = await dims(page);
    expect(moved.every((d) => d.kind === 'linear' && Math.abs(d.offset - 3600 - 500 + 1500) < 0.6)).toBe(
      true,
    );
    const [q1] = await perms(page);
    await dragPx(page, q1!.line, { x: q1!.line.x, y: q1!.line.y - 50 }, 'Alt');
    const after = await dims(page);
    expect(after.filter((d) => d.alignGroupId === null).length).toBe(1);
  });

  test('kóty 8: Rozdělit rovnoměrně posune mezilehlou stěnu', async ({ page }) => {
    const { b, c } = await three(page);
    await chainThenSelect(page);
    const [p1] = await perms(page);
    await page.mouse.click(p1!.line.x, p1!.line.y, { button: 'right' });
    await page.getByRole('button', { name: 'Rozdělit rovnoměrně' }).click();
    expect((await wallById(page, b)).path.start.x).toBeCloseTo(2000, 6);
    expect((await wallById(page, c)).path.start.x).toBeCloseTo(4000, 6);
  });

  test('kóty 6, 10: nabídka kóty – zamknout, přepsat text, vrátit hodnotu, přepnout stranu, smazat', async ({
    page,
  }) => {
    await three(page);
    await chainThenSelect(page);
    const menu = async () => {
      const [p] = await perms(page);
      await page.mouse.click(p!.line.x, p!.line.y, { button: 'right' });
    };
    await menu();
    await page.getByRole('button', { name: 'Zamknout' }).click();
    expect((await dims(page)).filter((d) => d.locked).length).toBe(1);
    await menu();
    await page.getByRole('button', { name: 'Přepsat text kóty' }).click();
    await page.getByTestId('value-edit').fill('cca 1 m');
    await page.getByTestId('value-edit').press('Enter');
    expect((await dims(page)).some((d) => d.textOverride === 'cca 1 m')).toBe(true);
    await menu();
    await page.getByRole('button', { name: 'Vrátit skutečnou hodnotu' }).click();
    expect((await dims(page)).every((d) => d.textOverride === null)).toBe(true);
    await menu();
    await page.getByRole('button', { name: 'Přepnout stranu kóty' }).click();
    await menu();
    await page.getByRole('button', { name: 'Smazat kótu' }).click();
    expect((await dims(page)).length).toBe(1);
  });

  test('kóty 13: kóta patří podlaží a jde do aktivní skupiny anotací pohledu', async ({ page }) => {
    await three(page);
    await chain(page);
    const m = await page.evaluate(() => window.__bim!.model());
    const view = m.views[await page.evaluate(() => window.__bim!.viewId())]!;
    for (const d of Object.values(m.dimensions)) {
      expect(d.storeyId).toBe(view.storeyId);
      expect(m.display.layers[d.annotationLayerId]?.kind).toBe('annotation');
    }
  });
});

test.describe('pravidla-interakce / kóty 9: úhlová kóta', () => {
  test('nástroj Úhel: klik na dvě stěny; číslo otočí vybranou stěnu; zámek funguje', async ({ page }) => {
    const a = await wall(page, { x: 0, y: 0 }, { x: 4000, y: 0 });
    const b = await wall(page, { x: 0, y: 500 }, { x: 0, y: 3000 });
    await page.keyboard.press('u');
    await clickAt(page, 2000, 150);
    await clickAt(page, -150, 1500);
    const ds = await dims(page);
    expect(ds[0]?.kind).toBe('angular');
    await page.keyboard.press('Escape');
    await clickAt(page, -150, 1500);
    const [p] = await perms(page);
    await page.mouse.click(p!.text.x, p!.text.y);
    await page.getByTestId('value-edit').fill('80');
    await page.getByTestId('value-edit').press('Enter');
    const wa = await wallById(page, a);
    const wb = await wallById(page, b);
    expect(wa.path.end.y).toBeCloseTo(0, 6);
    const ang =
      (Math.atan2(wb.path.end.y - wb.path.start.y, wb.path.end.x - wb.path.start.x) * 180) / Math.PI;
    expect(Math.abs(ang - 80) < 0.05 || Math.abs(ang - 100) < 0.05).toBe(true);
    await clickLock(page);
    expect((await dims(page))[0]?.locked).toBe(true);
    const pp = await px(page, 0, 0);
    expect(pp.x).toBeGreaterThan(0);
  });
});

test('kóty 5, 10: otevřené pole pro text zůstane, i když myš vjede na výkres', async ({ page }) => {
  await three(page);
  await chainThenSelect(page);
  const [p] = await perms(page);
  await page.mouse.click(p!.line.x, p!.line.y, { button: 'right' });
  await page.getByRole('button', { name: 'Přepsat text kóty' }).click();
  await page.mouse.move(5, 5);
  await moveTo(page, 2000, 1500);
  const input = page.getByTestId('value-edit');
  await expect(input).toBeVisible();
  await input.fill('cca 1 m');
  await input.press('Enter');
  expect((await dims(page)).some((d) => d.textOverride === 'cca 1 m')).toBe(true);
});

test.describe('závada: kóta délky stěny s nepřipojeným koncem', () => {
  test('nástroj Kóta: čelo volného konce + rovnoběžný líc stěny v rohu dá délku stěny', async ({ page }) => {
    const a = await wall(page, { x: 0, y: 0 }, { x: 4000, y: 0 });
    const b = await wall(page, { x: 4000, y: 0 }, { x: 4000, y: 3000 }, [
      { end: 'start', wallId: a, at: 'ATEND' },
    ]);
    await page.keyboard.press('d');
    await clickAt(page, 3850, 3000);
    await clickAt(page, 2000, 0);
    await clickAt(page, 2000, 1500);
    const ds = await dims(page);
    expect(ds.length).toBe(1);
    const d = ds[0];
    expect(
      d?.kind === 'linear' && d.refs.some((r) => 'wallId' in r && r.wallId === b && r.face === 'end'),
    ).toBe(true);
    expect((await perms(page)).length).toBe(1);
  });
});

test('pokyn uživatele 2026-11-27: zámeček jen u vybrané kóty – u nevybrané klik na jeho místo nezamkne', async ({
  page,
}) => {
  await three(page);
  await chainThenSelect(page);
  await page.mouse.click(5, 5);
  const before = (await dims(page)).map((d) => d.locked);
  const lock = (await perms(page))[0]!.lock;
  await page.mouse.click(lock.x, lock.y);
  expect((await dims(page)).map((d) => d.locked)).toEqual(before);
  await clickLock(page);
  expect((await dims(page)).some((d) => d.locked !== before[0])).toBe(true);
});

test('pokyn uživatele 2026-11-27: číslo vybrané kóty jde tažením posunout po kótovací čáře', async ({
  page,
}) => {
  await three(page);
  await chainThenSelect(page);
  const p = (await perms(page))[0]!;
  await page.mouse.click(p.line.x, p.line.y);
  const t = (await perms(page))[0]!.text;
  await page.mouse.move(t.x, t.y);
  await page.mouse.down();
  await page.mouse.move(t.x - 60, t.y, { steps: 6 });
  await page.mouse.move(t.x - 120, t.y, { steps: 6 });
  await page.mouse.up();
  const d = (await dims(page)).find((x) => x.id === p.id)!;
  expect(Math.abs(d.textShift ?? 0)).toBeGreaterThan(500);
});
