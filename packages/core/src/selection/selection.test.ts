import { describe, expect, it } from 'vitest';
import { vec } from '../geometry/index.ts';
import { fixture, room } from '../testing/fixture.ts';
import { boxSelect, rectOf } from './box.ts';
import { pickFace, selectableWallGeometry, wallsAt } from './pick.ts';

const viewOf = (f: ReturnType<typeof fixture>) => f.model.views[f.viewId]!;

describe('pravidla-interakce / Výběr', () => {
  it('klik: stěna pod bodem (uvnitř obrysu)', () => {
    const f = fixture();
    const [left] = room(f);
    const g = selectableWallGeometry(f.model, viewOf(f));
    expect(wallsAt(g, vec(-150, 1500), 1)).toEqual([left]);
    expect(wallsAt(g, vec(2000, 1500), 1)).toEqual([]);
  });

  it('Tab: překrývající se stěny, nejvrchnější první', () => {
    const f = fixture();
    const a = f.line(vec(0, 0), vec(4000, 0));
    const b = f.line(vec(0, 0), vec(4000, 0));
    expect(wallsAt(selectableWallGeometry(f.model, viewOf(f)), vec(2000, 100), 1)).toEqual([b, a]);
  });

  it('rámeček zleva doprava vybere jen celé stěny', () => {
    const f = fixture();
    const [left, top] = room(f);
    const r = boxSelect(f.model, viewOf(f), rectOf(vec(-1000, -1000), vec(1000, 4000)), false);
    expect(r.wallIds).toEqual([left]);
    expect(r.wallIds).not.toContain(top);
  });

  it('rámeček zprava doleva vybere i protnuté', () => {
    const f = fixture();
    const [left, top, , bottom] = room(f);
    const r = boxSelect(f.model, viewOf(f), rectOf(vec(-1000, -1000), vec(1000, 4000)), true);
    expect(r.wallIds.sort()).toEqual([left, top, bottom].sort());
  });

  it('kóty 12: rámeček vybírá i kóty; filtr kategorie', () => {
    const f = fixture();
    const [left, , right] = room(f);
    const [dim] = f.run('dimension.create', {
      kind: 'linear',
      refs: [
        { wallId: left, face: 'ref' },
        { wallId: right, face: 'ref' },
      ],
      viewId: f.viewId,
    });
    const all = boxSelect(f.model, viewOf(f), rectOf(vec(-2000, -2000), vec(6000, 6000)), false);
    expect(all.dimensionIds).toEqual([dim]);
    const onlyWalls = boxSelect(f.model, viewOf(f), rectOf(vec(-2000, -2000), vec(6000, 6000)), false, {
      walls: true,
      dimensions: false,
      slabs: false,
    });
    expect(onlyWalls.dimensionIds).toEqual([]);
    expect(onlyWalls.wallIds.length).toBe(4);
  });

  it('kóty 7: líc se vybírá s tolerancí', () => {
    const f = fixture();
    const [left] = room(f);
    const g = selectableWallGeometry(f.model, viewOf(f));
    expect(pickFace(g, vec(10, 1500), 12)).toMatchObject({ wallId: left, face: 'ref' });
    expect(pickFace(g, vec(-290, 1500), 12)).toMatchObject({ wallId: left, face: 'opp' });
    expect(pickFace(g, vec(1000, 1500), 12)).toBeNull();
  });
});
