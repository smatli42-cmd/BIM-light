import { describe, expect, it } from 'vitest';
import { createEmptyProject } from '../model/create.ts';
import { fixture } from '../testing/fixture.ts';

describe('koncepce-rozhrani / průvodní lekce: cvičný projekt vrátí původní projekt i s historií', () => {
  it('saveState / restoreState vrátí model a Zpět / Znovu', () => {
    const f = fixture();
    f.line({ x: 0, y: 0 }, { x: 5000, y: 0 });
    const model = f.model;
    const saved = f.editor.saveState();
    f.editor.load(createEmptyProject(() => 'x', 'Cvičný projekt'));
    expect(f.editor.canUndo).toBe(false);
    f.editor.restoreState(saved);
    expect(f.model).toBe(model);
    expect(f.editor.history).toEqual(['Stěna']);
  });
});
