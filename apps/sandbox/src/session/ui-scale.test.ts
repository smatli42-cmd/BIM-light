import { afterEach, describe, expect, it } from 'vitest';
import { applyUiSize, isUiSize, UI_BASE, uiK, uiPx } from './ui-scale.ts';

describe('velikost-ui (pokyn uživatele 2026-11-27)', () => {
  afterEach(() => applyUiSize('medium'));

  it('velikost-ui / Střední je o 20 % větší než původní rozhraní', () => {
    applyUiSize('medium');
    expect(uiK()).toBeCloseTo(UI_BASE, 6);
    expect(uiPx(12)).toBeCloseTo(14.4, 6);
  });

  it('velikost-ui / Největší zvětší texty kreslené do plátna o dalších 30 %', () => {
    applyUiSize('xlarge');
    expect(uiPx(10)).toBeCloseTo(15.6, 6);
  });

  it('velikost-ui / neznámá hodnota z úložiště není platná velikost', () => {
    expect(isUiSize('large')).toBe(true);
    expect(isUiSize('obri')).toBe(false);
  });
});
