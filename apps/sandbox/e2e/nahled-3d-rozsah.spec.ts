// Prohlížečové testy: rozsah 3D okna – podlaží (Filter and Cut Elements in 3D v Archicadu) a ořezový
// kvádr (Section Box v Revitu). Koncepce rozhraní, část 2 E; docs/STAV-3d.md.
import { expect, test, type Page } from '@playwright/test';
import { model } from './helpers.ts';

const storeysIn3d = async (page: Page) => {
  const m = await model(page);
  const ids = await page.evaluate(() => window.__bim3d?.elements() ?? []);
  return new Set(ids.map((id) => m.storeys[(m.elements[id] as { storeyId: string }).storeyId]!.name));
};

test.beforeEach(async ({ page }) => {
  // Větší okno: s větším rozhraním (velikost-ui) musí 3D okno zůstat dost velké na tažení kvádru.
  await page.setViewportSize({ width: 1900, height: 1100 });
  await page.goto('./?ukazka=dum&3d');
  await expect.poll(() => page.evaluate(() => window.__bim3d?.drawn())).toBe(true);
});

test('koncepce-rozhrani / G 10: rozsah podlaží – odškrtnout podlaží, Jen aktivní, Všechna', async ({
  page,
}) => {
  await expect.poll(() => storeysIn3d(page)).toEqual(new Set(['1.NP', '2.NP']));
  await page.getByTestId('view3d-storeys').click();
  await page.getByTestId('view3d-storey-2.NP').click();
  await expect.poll(() => storeysIn3d(page)).toEqual(new Set(['1.NP']));
  // Nabídka zůstává otevřená, poslední podlaží odškrtnout nejde.
  await page.getByTestId('view3d-storey-1.NP').click();
  await expect.poll(() => storeysIn3d(page)).toEqual(new Set(['1.NP']));
  await expect(page.getByTestId('view3d-storeys')).toContainText('1.NP');
  await page.getByTestId('view3d-storeys-all').click();
  await expect.poll(() => storeysIn3d(page)).toEqual(new Set(['1.NP', '2.NP']));
  await page.getByTestId('view3d-storeys').click();
  await page.getByTestId('view3d-storeys-active').click();
  await expect.poll(() => page.evaluate(() => window.__bim3d!.storeys()?.length)).toBe(1);
});

test('koncepce-rozhrani / G 10: ořezový kvádr – zapnout, stáhnout horní stěnu tažením, vypnout', async ({
  page,
}) => {
  await page.getByTestId('view3d-box').click();
  await expect.poll(() => page.evaluate(() => window.__bim3d!.box())).not.toBeNull();
  const top0 = (await page.evaluate(() => window.__bim3d!.box()))!.max.z;
  // Tažení horního úchytu dolů, dokud řez není pod úrovní 2.NP (3000).
  for (let i = 0; i < 8; i++) {
    const h = (await page.evaluate(() => window.__bim3d!.handleOf('z', 'max')))!;
    await page.mouse.move(h.x, h.y);
    await page.mouse.down();
    await page.mouse.move(h.x, h.y + 40, { steps: 5 });
    await page.mouse.up();
    if ((await page.evaluate(() => window.__bim3d!.box()))!.max.z < 2800) break;
  }
  const top1 = (await page.evaluate(() => window.__bim3d!.box()))!.max.z;
  expect(top1).toBeLessThan(Math.min(top0, 2800));
  // Řez pod 2.NP: z 2.NP nic nezůstane.
  await expect.poll(() => storeysIn3d(page)).not.toContain('2.NP');
  await page.getByTestId('view3d-box').click();
  await expect.poll(() => page.evaluate(() => window.__bim3d!.box())).toBeNull();
  await expect.poll(() => storeysIn3d(page)).toEqual(new Set(['1.NP', '2.NP']));
});

test('koncepce-rozhrani / G 10: 3D pohled je uložený – vlastní fáze, nový pohled, Undo kvádru', async ({
  page,
}) => {
  const m0 = await model(page);
  const statuses = async () => {
    const m = await model(page);
    const ids = await page.evaluate(() => window.__bim3d?.elements() ?? []);
    return new Set(ids.map((id) => (m.elements[id] as { status: string }).status));
  };
  // Fáze 3D pohledu: Bourací práce skryje nové prvky jen ve 3D, půdorys se nemění.
  await page.getByTestId('view3d-phase').click();
  await page.getByTestId('view3d-phase-Bourací práce').click();
  await expect.poll(statuses).not.toContain('new');
  const m1 = await model(page);
  expect(Object.values(m1.views).map((v) => v.phaseFilterId)).toEqual(
    Object.values(m0.views).map((v) => v.phaseFilterId),
  );
  // Ořezový kvádr je příkaz: Ctrl+Z ho vrátí.
  await page.getByTestId('view3d-box').click();
  await expect.poll(() => page.evaluate(() => window.__bim3d!.box())).not.toBeNull();
  await page.keyboard.press('Control+z');
  await expect.poll(() => page.evaluate(() => window.__bim3d!.box())).toBeNull();
  // Nový 3D pohled začíná se všemi podlažími a bez filtru; původní si nastavení drží.
  await page.getByTestId('view3d-views').click();
  await page.getByTestId('view3d-new').click();
  await expect.poll(async () => Object.keys((await model(page)).views3d).length).toBe(2);
  await expect.poll(statuses).toContain('new');
  await page.getByTestId('view3d-views').click();
  await page.getByTestId('view3d-view-3D').click();
  await expect.poll(statuses).not.toContain('new');
});

test('hlášení uživatele / fáze: Fáze ve spodní liště při aktivním 3D okně nastaví 3D – zbouraná stěna je vidět celá', async ({
  page,
}) => {
  const m0 = await model(page);
  await page.getByTestId('canvas-3d').click({ position: { x: 20, y: 20 } });
  await page.getByTestId('phase-menu').click();
  await page.getByTestId('phase-Bourací práce').click();
  // Fáze 3D pohledu se změnila, půdorys ne; popisek 3D i lišty ukazuje Bourací práce.
  await expect
    .poll(async () => Object.values((await model(page)).views3d).map((v) => v.phaseFilterId))
    .not.toEqual([null]);
  const m1 = await model(page);
  expect(Object.values(m1.views).map((v) => v.phaseFilterId)).toEqual(
    Object.values(m0.views).map((v) => v.phaseFilterId),
  );
  await expect(page.getByTestId('view3d-phase')).toContainText('Bourací práce');
  await expect(page.getByTestId('phase-menu')).toContainText('Bourací práce');
  // Zbouraná stěna je ve 3D a nová deska ji neořízne (výška z jádra = celá výška k stávajícímu stropu).
  const demolished = await page.evaluate(() => {
    const b = window.__bim!;
    const ids = window.__bim3d!.elements();
    const m = b.model();
    return Object.values(m.elements).filter((e) => e.status === 'demolished' && ids.includes(e.id)).length;
  });
  expect(demolished).toBeGreaterThan(0);
});
