import { describe, expect, it } from 'vitest';
import { displayV8toV9, projectV24toV25 } from './migrate-v8.ts';

describe('základy 9, 29: migrace zobrazení 8 → 9 a projektu 24 → 25 (velikosti razítka místnosti)', () => {
  it('základ 29: doplní číslo 2,5, ostatní 1,8 a řádkování 1,3; vlastní hodnotu nechá', () => {
    const d = displayV8toV9({ paperSizes: { labelText: 2.5, roomText: 2 } });
    expect(d['paperSizes']).toMatchObject({ roomNumberText: 2.5, roomText: 2, roomLineSpacing: 1.3 });
    const p = projectV24toV25({ display: { schemaVersion: 8, paperSizes: {} } });
    expect(p['display']).toMatchObject({ schemaVersion: 9, paperSizes: { roomText: 1.8 } });
  });
});
