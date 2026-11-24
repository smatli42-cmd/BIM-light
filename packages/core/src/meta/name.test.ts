import { describe, expect, it } from 'vitest';
import { CORE_NAME } from './name.ts';

describe('kostra / jádro', () => {
  it('kostra: jádro jde načíst bez DOM', () => {
    expect(CORE_NAME).toBe('BIM-light core');
    expect(typeof (globalThis as Record<string, unknown>)['document']).toBe('undefined');
  });
});
