import { describe, expect, it } from 'vitest';
import { fixture } from '../testing/fixture.ts';

describe('katalog-kresleni 5.2: zkušební běh příkazu pro náhled při tažení', () => {
  it('preview vrátí změněný model, ale nic neuloží a nepřidá krok Undo', () => {
    const f = fixture();
    const id = f.line({ x: 0, y: 0 }, { x: 0, y: 2000 });
    const steps = f.editor.history.length;
    const m = f.editor.preview('wall.moveEndpoint', { wallId: id, end: 'end', point: { x: 0, y: 3000 } });
    expect(m?.elements[id]?.path.end.y).toBe(3000);
    expect(f.wall(id).path.end.y).toBe(2000);
    expect(f.editor.history.length).toBe(steps);
  });

  it('neplatný příkaz dá null', () => {
    const f = fixture();
    expect(
      f.editor.preview('wall.moveEndpoint', { wallId: 'nic', end: 'end', point: { x: 0, y: 0 } }),
    ).toBeNull();
    expect(f.editor.preview('neni.prikaz', {})).toBeNull();
  });
});
