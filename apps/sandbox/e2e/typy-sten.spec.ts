// Prohlížečové testy: okno Editor typů a skladba typu stěny (plán stěn Z1, rozhodnutí 2026-11-26).
import { expect, test, type Page } from '@playwright/test';
import { clickAt, model, open, wall } from './helpers.ts';

test.beforeEach(async ({ page }) => {
  await open(page);
});

async function openType(page: Page, name: string) {
  await page.getByTestId('tab-types').click();
  await page.getByTestId('type-search').fill(name);
  await page.getByTestId('type-row').first().click();
}

const typeByName = async (page: Page, name: string) =>
  Object.values((await model(page)).wallTypes).find((t) => t.name === name);

test.describe('plán stěn Z1 / okno Editor typů', () => {
  test('seznam typů z knihovny, hledání a Použití', async ({ page }) => {
    await wall(page, { x: 0, y: 0 }, { x: 4000, y: 0 });
    await page.getByTestId('tab-types').click();
    await expect(page.getByTestId('type-editor-dialog')).toBeVisible();
    await expect(page.getByTestId('type-row')).toHaveCount(8);
    await page.getByTestId('type-search').fill('Zdivo 300');
    await expect(page.getByTestId('type-row')).toHaveCount(1);
    await page.getByTestId('type-row').click();
    await expect(page.getByTestId('type-usage')).toContainText('1 stěn');
    await expect(page.getByTestId('type-preview')).toBeVisible();
  });

  test('editor: přidat vrstvu zvětší tloušťku, smazat ji vrátí; součet se ukáže', async ({ page }) => {
    await openType(page, 'Obvodová');
    await expect(page.getByTestId('type-total')).toContainText('465 mm');
    await page.getByTestId('layer-add').click();
    await expect(page.getByTestId('type-total')).toContainText('475 mm');
    await page.getByTestId('type-layer-3').getByTestId('field-thickness').fill('20');
    await page.getByTestId('type-layer-3').getByTestId('field-thickness').press('Enter');
    await expect(page.getByTestId('type-total')).toContainText('485 mm');
    await page.getByTestId('type-layer-3').getByTestId('layer-remove').click();
    await expect(page.getByTestId('type-total')).toContainText('465 mm');
  });

  test('typ bez jádra: „líc jádra“ je zašedlý', async ({ page }) => {
    await openType(page, 'Obvodová');
    const core = page.getByTestId('type-layer-1');
    await core.getByTestId('field-function').selectOption('insulation');
    await expect(page.locator('[data-testid=type-refline] option[value=core-face]')).toBeDisabled();
  });

  test('duplikovat a smazat použitý typ s náhradou', async ({ page }) => {
    await wall(page, { x: 0, y: 0 }, { x: 4000, y: 0 });
    await openType(page, 'Zdivo 300');
    await page.getByTestId('type-duplicate').click();
    expect(await typeByName(page, 'Zdivo 300 (2)')).toBeTruthy();
    // Kopie se v okně hned vybere (jako v Revitu); smazat původní typ = vybrat ho v seznamu.
    await expect(page.getByTestId('type-name')).toHaveValue('Zdivo 300 (2)');
    await page.getByTestId('type-row').first().click();
    await page.getByTestId('type-delete').click();
    expect(await typeByName(page, 'Zdivo 300')).toBeUndefined();
    const m = await model(page);
    const w = Object.values(m.elements)[0]!;
    expect(m.wallTypes[w.typeId]).toBeTruthy();
  });

  test('vyčistit nepoužité a načíst typ z knihovny zpět', async ({ page }) => {
    await wall(page, { x: 0, y: 0 }, { x: 4000, y: 0 });
    await page.getByTestId('tab-types').click();
    await page.getByTestId('type-purge').click();
    await expect(page.getByTestId('type-row')).toHaveCount(1);
    await page.getByTestId('type-library').selectOption({ label: 'SDK příčka 100' });
    await page.getByTestId('type-load').click();
    expect((await typeByName(page, 'SDK příčka 100'))?.source?.itemId).toBe('drywall-100');
  });

  test('rozhodnutí 2026-11-26: okno se otevře ze záložky Typ vybrané stěny na jejím typu, Esc zavře', async ({
    page,
  }) => {
    await wall(page, { x: 0, y: 0 }, { x: 4000, y: 0 });
    await clickAt(page, 2000, 150);
    await page.getByTestId('ib-type').click();
    await page.getByTestId('open-type-editor').click();
    await expect(page.getByTestId('type-name')).toHaveValue('Zdivo 300');
    await expect(page.getByRole('tab', { name: 'Střechy' })).toBeDisabled();
    await page.getByTestId('type-name').press('Escape');
    await expect(page.getByTestId('type-editor-dialog')).toHaveCount(0);
  });

  test('rozhodnutí 2026-11-26: nový typ se v okně hned vybere a upravuje', async ({ page }) => {
    await page.getByTestId('tab-types').click();
    await page.getByTestId('type-new').click();
    await expect(page.getByTestId('type-name')).toHaveValue('Nový typ');
    await page.getByTestId('type-layer-0').getByTestId('field-thickness').fill('250');
    await page.getByTestId('type-layer-0').getByTestId('field-thickness').press('Enter');
    await expect(page.getByTestId('type-total')).toContainText('250 mm');
    await page.getByTestId('type-editor-close').click();
    await expect(page.getByTestId('type-editor-dialog')).toHaveCount(0);
  });

  test('koncepce rozhraní 11a / krok 2: náhled Půdorys / Řez / 3D, klik na vrstvu ji vybere v tabulce', async ({
    page,
  }) => {
    await openType(page, 'Obvodová');
    const preview = page.getByTestId('type-preview');
    await expect(preview).toHaveAttribute('data-mode', 'plan');
    await preview.click();
    await expect(page.getByTestId('type-layer-1')).toHaveClass(/selected/);
    await page.getByTestId('preview-section').click();
    await expect(preview).toHaveAttribute('data-mode', 'section');
    await page.getByTestId('preview-iso').click();
    await expect(preview).toHaveAttribute('data-mode', 'iso');
    await page.getByTestId('type-layer-2').getByTestId('field-thickness').click();
    await expect(page.getByTestId('type-layer-2')).toHaveClass(/selected/);
    await expect(page.getByTestId('type-layer-1')).not.toHaveClass(/selected/);
  });

  test('koncepce rozhraní 11a / krok 3: společná skladba – přiřadit, sdílí dva typy, Použít pro', async ({
    page,
  }) => {
    await openType(page, 'Zdivo 300');
    await page.getByTestId('composition-select').selectOption({ label: 'Obvodová zateplená 465' });
    await expect(page.getByTestId('type-total')).toContainText('465 mm');
    await expect(page.getByTestId('composition-shared')).toContainText('Sdílí 2 typy');
    await expect(page.getByTestId('composition-use-wall')).toBeDisabled();
    await page.getByTestId('composition-use-roof').check();
    const m = await model(page);
    const c = Object.values(m.compositions).find((x) => x.name === 'Obvodová zateplená 465')!;
    expect(c.use).toEqual({ wall: true, slab: false, roof: true });
  });

  test('vybraná stěna: změna typu v panelu Vlastnosti', async ({ page }) => {
    await wall(page, { x: 0, y: 0 }, { x: 4000, y: 0 });
    await clickAt(page, 2000, 150);
    const t = await typeByName(page, 'ŽB stěna 200');
    await page.getByTestId('sel-type').selectOption(t!.id);
    const m = await model(page);
    expect(Object.values(m.elements)[0]!.typeId).toBe(t!.id);
  });
});
