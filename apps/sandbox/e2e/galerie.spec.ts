// Prohlížečový test: galerie napojení stěn (plán stěn Z2, oblouky Z5) se otevře a přepíná Studie / Projekt.
import { expect, test } from '@playwright/test';

test('plan-steny / Z2: galerie napojení ukáže všechny konfigurace bez chyby', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('./#galerie');
  // 16 konfigurací ze Z2 + 6 s oblouky ze Z5.
  await expect(page.getByTestId('gallery-card')).toHaveCount(22);
  await expect(page.getByText('L – zateplená × zateplená')).toBeVisible();
  await expect(page.getByText('Kruh ze dvou oblouků')).toBeVisible();
  await page.getByRole('button', { name: 'Studie' }).click();
  await page.getByRole('button', { name: 'Projekt' }).click();
  expect(errors).toEqual([]);
});
