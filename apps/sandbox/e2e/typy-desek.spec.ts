// Prohlížečové testy: okno Editor typů → Desky (nosné desky a podlahy), úprava skladby desky přes
// příkazy slabType.* (scéna ?ukazka=typy-desek).
import { expect, test, type Page } from '@playwright/test';
import { model } from './helpers.ts';

const slabTypes = async (page: Page) => Object.values((await model(page)).slabTypes);
const typeId = async (page: Page, name: string) => (await slabTypes(page)).find((t) => t.name === name)?.id;
const thickness = (page: Page, name: string) =>
  page.evaluate((n) => {
    const m = window.__bim!.model();
    const t = Object.values(m.slabTypes).find((x) => x.name === n);
    const c = t && m.compositions[t.compositionId];
    return c ? c.layers.reduce((s, l) => s + l.thickness, 0) : null;
  }, name);

async function openSlabs(page: Page, name: string) {
  await page.goto('./?ukazka=typy-desek');
  await expect.poll(() => typeId(page, 'ŽB strop 200')).toBeTruthy();
  await page.getByTestId('tab-types').click();
  await page.getByTestId('type-kind-slabs').click();
  await page.getByTestId('type-search').fill(name);
  await page.getByTestId('type-row').first().click();
}

test.describe('editor typů desek', () => {
  test('seznam po funkcích, náhled řezu, vrstvy: tloušťka, navrch, přesun, smazání', async ({ page }) => {
    await openSlabs(page, '');
    await expect(page.getByTestId('slab-group-structure')).toContainText('ŽB strop 200');
    await expect(page.getByTestId('slab-group-floor')).toContainText('Podlaha dlažba 160');
    await expect(page.getByTestId('slab-group-floor')).not.toContainText('ŽB strop');
    await page.getByTestId('type-search').fill('dlažba');
    await page.getByTestId('type-row').first().click();
    await expect(page.getByTestId('type-total')).toContainText('160 mm');
    await expect(page.getByTestId('slab-preview').getByTestId('type-preview')).toBeVisible();
    // Vrstva 1 (odspodu) = anhydrit 50 → 70: deska zesílí.
    const anhydrite = page.getByTestId('type-layer-1').getByTestId('field-thickness');
    await anhydrite.fill('70');
    await anhydrite.press('Enter');
    await expect(page.getByTestId('type-total')).toContainText('180 mm');
    expect(await thickness(page, 'Podlaha dlažba 160')).toBe(180);
    await page.getByTestId('layer-add').click();
    await expect(page.getByTestId('type-total')).toContainText('190 mm');
    // Nová vrstva je navrch (index 3) a v tabulce první; šipka dolů ji posune pod dlažbu.
    await expect(page.locator('[data-testid^=type-layer-]').first()).toHaveAttribute(
      'data-testid',
      'type-layer-3',
    );
    await page.getByTestId('type-layer-3').getByTitle('Posunout dolů').click();
    await page.getByTestId('type-layer-2').getByTestId('layer-remove').click();
    await expect(page.getByTestId('type-total')).toContainText('180 mm');
    // Původní typ (sdílí jen svou skladbu) se nezměnil.
    expect(await thickness(page, 'Podlaha anhydrit 150')).toBe(150);
  });

  test('duplikovat (vlastní skladba), přejmenovat, smazat; použitý typ smazat nejde', async ({ page }) => {
    await openSlabs(page, 'ŽB strop 200');
    await expect(page.getByTestId('type-usage')).toContainText('1 desek');
    await expect(page.getByTestId('type-delete')).toBeDisabled();
    await page.getByTestId('type-duplicate').click();
    await expect(page.getByTestId('type-name')).toHaveValue('ŽB strop 200 (2)');
    await page.getByTestId('type-name').fill('ŽB strop 180');
    await page.getByTestId('type-name').press('Enter');
    await expect.poll(() => typeId(page, 'ŽB strop 180')).toBeTruthy();
    const core = page.getByTestId('type-layer-1').getByTestId('field-thickness');
    await core.fill('180');
    await core.press('Enter');
    await expect(page.getByTestId('type-total')).toContainText('190 mm');
    expect(await thickness(page, 'ŽB strop 200')).toBe(210);
    await page.getByTestId('type-delete').click();
    await expect.poll(() => typeId(page, 'ŽB strop 180')).toBeUndefined();
  });
});
