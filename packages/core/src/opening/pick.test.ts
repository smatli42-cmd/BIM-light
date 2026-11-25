import { describe, expect, it } from 'vitest';
import { vec } from '../geometry/index.ts';
import { fixture, room } from '../testing/fixture.ts';
import { openingAt, snapOpening } from './pick.ts';

describe('plan-steny / Z4: výběr a přichytávání otvoru (základ 20)', () => {
  it('klik do otvoru vybere otvor, mimo něj nic', () => {
    const f = fixture();
    const w = f.line(vec(0, 0), vec(6000, 0));
    const [o] = f.run('opening.create', { wallId: w, offset: 2000, width: 1200 });
    const view = f.model.views[f.viewId]!;
    expect(openingAt(f.model, view, vec(2600, 150), 5)).toBe(o);
    expect(openingAt(f.model, view, vec(1000, 150), 5)).toBeNull();
  });

  it('přichytí ke středu stěny, k líci v rohu, k sousednímu otvoru a k ose otvoru v jiné stěně', () => {
    const f = fixture();
    const [, top, , bottom] = room(f);
    // Horní stěna jde zleva doprava (0 → 4000), vnitřní líc začíná v x = 0.
    expect(snapOpening(f.model, top, 2030, 1000, 50)).toEqual({ offset: 1500, label: 'střed stěny' });
    expect(snapOpening(f.model, top, 520, 1000, 50)).toEqual({ offset: 0, label: 'líc' });
    f.run('opening.create', { wallId: top, offset: 0, width: 900 });
    expect(snapOpening(f.model, top, 1420, 1000, 50).label).toBe('otvor');
    f.run('opening.create', { wallId: bottom, offset: 1000, width: 800 });
    // Spodní stěna jde zprava doleva (4000 → 0): střed otvoru je v x = 2600.
    expect(snapOpening(f.model, top, 2580, 1000, 50)).toEqual({ offset: 2100, label: 'osa otvoru' });
  });
});

describe('plan-steny / Z4: výběr stěny přerušené otvorem (oprava)', () => {
  it('stěna jde vybrat kliknutím i do menší části vedle otvoru a rámečkem', async () => {
    const { wallsAt, selectableWallGeometry } = await import('../selection/pick.ts');
    const { boxSelect } = await import('../selection/box.ts');
    const f = fixture();
    const w = f.line(vec(0, 0), vec(6000, 0));
    const [o] = f.run('opening.create', { wallId: w, offset: 1400, width: 1200 });
    const view = f.model.views[f.viewId]!;
    expect(wallsAt(selectableWallGeometry(f.model, view), vec(500, 150), 1)).toEqual([w]);
    const r = { x0: -100, y0: -100, x1: 6100, y1: 400 };
    expect(boxSelect(f.model, view, r, false)).toMatchObject({ wallIds: [w], openingIds: [o] });
  });
});
