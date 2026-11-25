import { describe, expect, it } from 'vitest';
import { fillColor, inkColor } from './paper.ts';

describe('koncepce-rozhrani / 5: barvy výkresu na tmavém podkladu (jen zobrazení)', () => {
  it('na papíře se barvy nemění', () => {
    expect(inkColor('#000000', 'light')).toBe('#000000');
    expect(fillColor('#e8c9bc', 'light')).toBe('#e8c9bc');
  });
  it('černá čára je na tmavém podkladu světlá, světlá barva zůstane', () => {
    const c = inkColor('#000000', 'dark');
    expect(parseInt(c.slice(1, 3), 16)).toBeGreaterThan(200);
    expect(inkColor('#ffd700', 'dark')).toBe('#ffd700');
  });
  it('výplň se na tmavém podkladu ztlumí (je tmavší než původní)', () => {
    const c = fillColor('#ffffff', 'dark');
    expect(parseInt(c.slice(1, 3), 16)).toBeLessThan(160);
  });
});
