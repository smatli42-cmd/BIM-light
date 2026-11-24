import { expect, test, type Page } from '@playwright/test';
import { clickAt, dims, moveTo, open, perms, room, temps, wallById } from './helpers.ts';

test.beforeEach(async ({ page }) => {
  await open(page);
});

async function typeInto(page: Page, at: { x: number; y: number }, value: string) {
  await page.mouse.click(at.x, at.y);
  const input = page.getByTestId('value-edit');
  await expect(input).toBeVisible();
  await input.fill(value);
  await input.press('Enter');
}

async function pinCross(page: Page, toX: number, toY: number) {
  const t = (await temps(page)).find((x) => x.key.startsWith('x-'))!;
  await page.mouse.click(t.pin!.x, t.pin!.y);
  await moveTo(page, toX, toY);
}

test.describe('katalog-kresleni / část 3: dočasné kóty', () => {
  test('[R] 3: po výběru stěny dočasné kóty k lícům – příčně k protější stěně, podélně délka', async ({
    page,
  }) => {
    await room(page);
    await clickAt(page, -150, 1500);
    const t = await temps(page);
    expect(t.find((x) => x.key.startsWith('x-'))?.value).toBeCloseTo(4000, 6);
    expect(t.find((x) => x.key === 'len')?.value).toBeCloseTo(3000, 6);
  });

  test('3.3 + základ 25: číslo dočasné kóty posune vybranou stěnu, protější stojí', async ({ page }) => {
    const [left, , right] = await room(page);
    await clickAt(page, -150, 1500);
    const t = (await temps(page)).find((x) => x.key.startsWith('x-'))!;
    await typeInto(page, t.text, '3500');
    expect((await wallById(page, left)).path.start.x).toBeCloseTo(500, 6);
    expect((await wallById(page, right)).path.start.x).toBeCloseTo(4000, 6);
  });

  test('3.4 [R]: délka – pohne se konec zvolený trojúhelníkem; tažený uzel se stane uchopeným koncem', async ({
    page,
  }) => {
    const [, , , bottom] = await room(page);
    await clickAt(page, 2000, -150);
    expect(await page.evaluate(() => window.__bim!.lenEnd())).toBe('end');
    const tri = (await temps(page)).find((x) => x.key === 'len')!.lenEnd!;
    await page.mouse.click(tri.x, tri.y);
    expect(await page.evaluate(() => window.__bim!.lenEnd())).toBe('start');
    const before = await wallById(page, bottom);
    const len = (await temps(page)).find((x) => x.key === 'len')!;
    await typeInto(page, len.text, '3500');
    const after = await wallById(page, bottom);
    expect(after.path.end).toEqual(before.path.end);
    expect(after.path.start.x).toBeCloseTo(3500, 6);
  });

  test('[R] 3: dočasnou kótu jde odsunout tažením, model se nemění', async ({ page }) => {
    await room(page);
    await clickAt(page, -150, 1500);
    const t = (await temps(page)).find((x) => x.key.startsWith('x-'))!;
    const before = JSON.stringify(await page.evaluate(() => window.__bim!.model()));
    await page.mouse.move(t.line.x, t.line.y);
    await page.mouse.down();
    await page.mouse.move(t.line.x, t.line.y - 60, { steps: 5 });
    await page.mouse.up();
    const moved = (await temps(page)).find((x) => x.key === t.key)!;
    expect(moved.line.y).toBeLessThan(t.line.y - 30);
    expect(JSON.stringify(await page.evaluate(() => window.__bim!.model()))).toBe(before);
  });
});

test.describe('katalog-kresleni / část 4 a pravidla-interakce kóty 1, 2, 5 (regrese z prototypu)', () => {
  test('kóty 2: kolečko udělá trvalou kótu, ta se nese na myši a vznikne až kliknutím; je odemčená', async ({
    page,
  }) => {
    await room(page);
    await clickAt(page, -150, 1500);
    await pinCross(page, 1500, 2200);
    expect((await dims(page)).length).toBe(0);
    const draft = await page.evaluate(() => window.__bim!.overlay().draftDims ?? []);
    expect(draft.length).toBe(1);
    await clickAt(page, 1500, 2200);
    const ds = await dims(page);
    expect(ds.length).toBe(1);
    expect(ds[0]?.locked).toBe(false);
  });

  test('regrese: usazená kóta se už nehýbe', async ({ page }) => {
    await room(page);
    await clickAt(page, -150, 1500);
    await pinCross(page, 1500, 2200);
    await clickAt(page, 1500, 2200);
    const placed = JSON.stringify(await dims(page));
    await moveTo(page, 1500, 800);
    await moveTo(page, 2500, 600);
    expect(JSON.stringify(await dims(page))).toBe(placed);
  });

  test('regrese kóty 1: zámek jen klikem na zámek, nikdy změnou čísla; pole je čitelné', async ({ page }) => {
    const [left] = await room(page);
    await clickAt(page, -150, 1500);
    await pinCross(page, 1500, 2200);
    await clickAt(page, 1500, 2200);
    const p = (await perms(page))[0]!;
    await page.mouse.click(p.text.x, p.text.y);
    const input = page.getByTestId('value-edit');
    await expect(input).toBeVisible();
    const color = await input.evaluate((el) => getComputedStyle(el).color);
    expect(color).toBe('rgb(17, 17, 17)');
    await input.fill('3800');
    await input.press('Enter');
    expect((await dims(page))[0]?.locked).toBe(false);
    expect((await wallById(page, left)).path.start.x).toBeCloseTo(200, 6);
    const lock = (await perms(page))[0]!.lock;
    await page.mouse.click(lock.x, lock.y);
    expect((await dims(page))[0]?.locked).toBe(true);
  });

  test('katalog 4 [R]: změna porušující zamčenou kótu se odmítne a vysvětlí', async ({ page }) => {
    const [left] = await room(page);
    await clickAt(page, -150, 1500);
    await pinCross(page, 1500, 2200);
    await clickAt(page, 1500, 2200);
    const lock = (await perms(page))[0]!.lock;
    await page.mouse.click(lock.x, lock.y);
    await clickAt(page, -150, 1500);
    await page.keyboard.press('ArrowRight');
    await expect(page.getByTestId('toast').last()).toBeVisible();
    expect((await wallById(page, left)).path.start.x).toBeCloseTo(0, 6);
  });

  test('regrese: nová kóta se nepřichytí sama k existující', async ({ page }) => {
    await room(page);
    await clickAt(page, -150, 1500);
    await pinCross(page, 1500, 2200);
    await clickAt(page, 1500, 2200);
    await clickAt(page, -150, 1500);
    await pinCross(page, 1500, 1200);
    await clickAt(page, 1500, 1200);
    const ds = await dims(page);
    expect(ds.length).toBe(2);
    expect(ds.every((d) => d.alignGroupId === null)).toBe(true);
  });

  test('regrese kóty 11: druhá sada na stejném prvku se nepřilepí k první, ale blízko se zarovná', async ({
    page,
  }) => {
    await room(page);
    await clickAt(page, -150, 1500);
    await pinCross(page, 1500, 2200);
    await clickAt(page, 1500, 2200);
    await clickAt(page, -150, 1500);
    await pinCross(page, 1500, 2230);
    await clickAt(page, 1500, 2230);
    const ds = await dims(page);
    expect(ds.length).toBe(2);
    expect(ds[0]?.alignGroupId).not.toBeNull();
    expect(ds[0]?.alignGroupId).toBe(ds[1]?.alignGroupId);
  });

  test('regrese: při výběru dvou protilehlých stěn se hýbe jen vybraná', async ({ page }) => {
    const [left, , right] = await room(page);
    await clickAt(page, -150, 1500);
    await pinCross(page, 1500, 2200);
    await clickAt(page, 1500, 2200);
    await clickAt(page, 4150, 1500);
    const p = (await perms(page))[0]!;
    await typeInto(page, p.text, '3000');
    expect((await wallById(page, right)).path.start.x).toBeCloseTo(3000, 6);
    expect((await wallById(page, left)).path.start.x).toBeCloseTo(0, 6);
    await clickAt(page, -150, 1500);
    const q = (await perms(page))[0]!;
    await typeInto(page, q.text, '2500');
    expect((await wallById(page, left)).path.start.x).toBeCloseTo(500, 6);
    expect((await wallById(page, right)).path.start.x).toBeCloseTo(3000, 6);
  });
});

test('katalog 4 [R]: u odmítnuté změny se zvýrazní kóta a nabídne její odemknutí', async ({ page }) => {
  await room(page);
  await clickAt(page, -150, 1500);
  await pinCross(page, 1500, 2200);
  await clickAt(page, 1500, 2200);
  const lock = (await perms(page))[0]!.lock;
  await page.mouse.click(lock.x, lock.y);
  await clickAt(page, -150, 1500);
  await page.keyboard.press('ArrowRight');
  await page.getByTestId('toast-action').click();
  expect((await dims(page))[0]?.locked).toBe(false);
});
