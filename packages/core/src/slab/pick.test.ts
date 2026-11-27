import { describe, expect, it } from 'vitest';
import { vec } from '../geometry/index.ts';
import { boxSelect, rectOf } from '../selection/box.ts';
import { fixture, type Fixture } from '../testing/fixture.ts';
import { slabsAt } from './pick.ts';

const typeId = (f: Fixture, name: string) =>
  Object.values(f.model.slabTypes).find((t) => t.name === name)!.id;
const make = (f: Fixture, name: string) =>
  f.run('slab.create', {
    storeyId: f.storeyId,
    typeId: typeId(f, name),
    rect: { a: vec(0, 0), b: vec(4000, 3000) },
  })[0]!;

describe('pravidla-interakce: Výběr / D2: výběr desky', () => {
  it('Výběr: klik do obrysu vybere desku, výš položená (podlaha) je první, mimo obrys nic', () => {
    const f = fixture();
    const rc = make(f, 'ŽB strop 250');
    const floor = make(f, 'Podlaha anhydrit 150');
    const view = f.model.views[f.viewId]!;
    expect(slabsAt(f.model, view, vec(2000, 1500), 5)).toEqual([floor, rc]);
    expect(slabsAt(f.model, view, vec(4003, 1500), 5)).toEqual([floor, rc]);
    expect(slabsAt(f.model, view, vec(5000, 1500), 5)).toEqual([]);
  });

  it('Výběr: rámeček zleva jen celé desky, zprava i protnuté; filtr desky vypne', () => {
    const f = fixture();
    const rc = make(f, 'ŽB strop 250');
    const view = f.model.views[f.viewId]!;
    const part = rectOf(vec(-100, -100), vec(2000, 4000));
    expect(boxSelect(f.model, view, part, false).slabIds).toEqual([]);
    expect(boxSelect(f.model, view, part, true).slabIds).toEqual([rc]);
    const all = rectOf(vec(-100, -100), vec(5000, 4000));
    expect(boxSelect(f.model, view, all, false).slabIds).toEqual([rc]);
    const off = { walls: true, dimensions: true, slabs: false };
    expect(boxSelect(f.model, view, all, false, off).slabIds).toEqual([]);
  });

  it('Výběr: deska ve skryté vrstvě Desky se nevybere', () => {
    const f = fixture();
    make(f, 'ŽB strop 250');
    f.run('view.setLayerState', { viewId: f.viewId, layerId: f.layer('Desky'), visible: false });
    expect(slabsAt(f.model, f.model.views[f.viewId]!, vec(2000, 1500), 5)).toEqual([]);
  });
});
