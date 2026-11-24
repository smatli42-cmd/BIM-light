import { describe, expect, it } from 'vitest';
import { fixture, room, type Fixture } from '../testing/fixture.ts';
import { drawView } from '../view/draw-view.ts';

function setup() {
  const f = fixture();
  const [left, top, right, bottom] = room(f);
  const [width] = f.run('dimension.create', {
    kind: 'linear',
    refs: [
      { wallId: left, face: 'ref' },
      { wallId: right, face: 'ref' },
    ],
    viewId: f.viewId,
  });
  return { f, left, top, right, bottom, width: width as string };
}

const lock = (f: Fixture, id: string) => f.run('dimension.setLocked', { dimensionId: id, locked: true });

describe('katalog-kresleni / část 4 a pravidla-interakce / kóty 1: zámek kóty', () => {
  it('část 4: změna, která by porušila zamčenou kótu, se odmítne a program řekne proč', () => {
    const { f, left, width } = setup();
    lock(f, width);
    const before = f.model;
    const r = f.editor.execute('wall.offset', { wallId: left, distance: 300 });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe('lock-violation');
      expect(r.error.dimensionIds).toEqual([width]);
      expect(r.error.message).toContain('4000');
    }
    expect(f.model).toBe(before);
  });

  it('část 4: zamčená kóta drží hodnotu, i když se mění jiné stěny', () => {
    const { f, top, width } = setup();
    lock(f, width);
    f.run('wall.offset', { wallId: top, distance: 500 });
    expect(f.model.dimensions[width]?.value).toBeCloseTo(4000);
  });

  it('kóty 1: zámek se nastaví jen příkazem zámku, změna čísla ho nikdy nezapne ani nevypne', () => {
    const { f, width } = setup();
    f.run('dimension.setValue', { dimensionId: width, value: 4500 });
    expect(f.model.dimensions[width]?.locked).toBe(false);
    lock(f, width);
    f.run('dimension.setValue', { dimensionId: width, value: 4200 });
    expect(f.model.dimensions[width]?.locked).toBe(true);
    expect(f.model.dimensions[width]?.value).toBe(4200);
  });

  it('část 4: odemčená kóta jen ukazuje hodnotu a nic nedrží', () => {
    const { f, left, width } = setup();
    f.run('dimension.setValue', { dimensionId: width, value: 4500 });
    expect(f.editor.execute('wall.offset', { wallId: left, distance: 300 }).ok).toBe(true);
  });

  it('část 4: dva zámky v rozporu – druhá změna se odmítne', () => {
    const { f, top, width } = setup();
    lock(f, width);
    const [len] = f.run('dimension.create', {
      kind: 'length',
      ref: { wallId: top, face: 'ref' },
      viewId: f.viewId,
    });
    lock(f, len ?? '');
    const r = f.editor.execute('dimension.setValue', { dimensionId: width, value: 5000 });
    expect(r.ok).toBe(false);
    expect(!r.ok && r.error.dimensionIds).toEqual([len]);
  });

  it('základ 28: zámek platí i ve skryté skupině anotací', () => {
    const { f, left, width } = setup();
    lock(f, width);
    f.run('view.setStyle', { viewId: f.viewId, styleId: f.style('Projekt') });
    const drawn = drawView(f.model, f.viewId).primitives.some((p) => p.source.dimensionId === width);
    expect(drawn).toBe(false);
    expect(f.editor.execute('wall.offset', { wallId: left, distance: 300 }).ok).toBe(false);
  });

  it('kóty 9: zámek úhlové kóty drží úhel (tolerance 0,05°)', () => {
    const { f, left, top } = setup();
    const [ang] = f.run('dimension.create', { kind: 'angular', wallIds: [left, top], viewId: f.viewId });
    lock(f, ang ?? '');
    expect(
      f.editor.execute('wall.moveEndpoint', { wallId: left, end: 'start', point: { x: 300, y: 0 } }).ok,
    ).toBe(false);
  });
});
