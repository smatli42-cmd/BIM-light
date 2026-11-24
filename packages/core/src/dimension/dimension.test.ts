import { describe, expect, it } from 'vitest';
import { fixture, room, type Fixture } from '../testing/fixture.ts';
import { activeAnnotationLayer } from '../view/effective.ts';
import { formatAngle, formatLength } from './format.ts';
import { measureDimension } from './measure.ts';

function linear(f: Fixture, a: string, b: string, extra: Record<string, unknown> = {}) {
  const [id] = f.run('dimension.create', {
    kind: 'linear',
    refs: [
      { wallId: a, face: 'ref' },
      { wallId: b, face: 'ref' },
    ],
    viewId: f.viewId,
    ...extra,
  });
  return id as string;
}

const value = (f: Fixture, id: string) => {
  const d = f.model.dimensions[id];
  if (!d) throw new Error('kóta chybí');
  return measureDimension(f.model, d);
};

describe('katalog-kresleni / část 4 a pravidla-interakce / kóty: trvalá kóta', () => {
  it('část 4: kóta odkazuje na líce stěn, ne na souřadnice; měří světlou vzdálenost líců', () => {
    const f = fixture();
    const [left, top, right] = room(f);
    const d = linear(f, left, right);
    expect(value(f, d)).toBeCloseTo(4000);
    f.run('wall.setThickness', { wallId: left, thickness: 450 });
    expect(value(f, d)).toBeCloseTo(4000);
    const [len] = f.run('dimension.create', {
      kind: 'length',
      ref: { wallId: top, face: 'opp' },
      viewId: f.viewId,
    });
    expect(value(f, len ?? '')).toBeCloseTo(4750);
  });

  it('část 4: nová kóta je odemčená a patří podlaží', () => {
    const f = fixture();
    const [left, , right] = room(f);
    const id = linear(f, left, right);
    const d = f.model.dimensions[id];
    expect(d?.locked).toBe(false);
    expect(d?.storeyId).toBe(f.storeyId);
  });

  it('kóty 13 / základ 28: nová kóta jde do aktivní skupiny anotací pohledu', () => {
    const f = fixture();
    const [left, , right] = room(f);
    const view = f.model.views[f.viewId];
    const id = linear(f, left, right);
    const d = f.model.dimensions[id];
    expect(view && d?.annotationLayerId).toBe(view && activeAnnotationLayer(f.model, view));
    expect(d?.annotationLayerId).toBe(f.layer('Kóty a popisky – studie'));
    f.run('view.setActiveAnnotationLayer', { viewId: f.viewId, layerId: f.layer('Kóty a popisky – PPS') });
    const id2 = linear(f, left, right);
    const d2 = f.model.dimensions[id2];
    expect(d2?.annotationLayerId).toBe(f.layer('Kóty a popisky – PPS'));
  });

  it('kóty 11: na stejné dvojici líců může být libovolně mnoho kót', () => {
    const f = fixture();
    const [left, , right] = room(f);
    linear(f, left, right);
    linear(f, left, right);
    linear(f, left, right, { offset: 800 });
    expect(Object.keys(f.model.dimensions)).toHaveLength(3);
  });

  it('kóty: vzdálenost jde kótovat jen mezi rovnoběžnými líci', () => {
    const f = fixture();
    const [left, top] = room(f);
    const r = f.editor.execute('dimension.create', {
      kind: 'linear',
      refs: [
        { wallId: left, face: 'ref' },
        { wallId: top, face: 'ref' },
      ],
      viewId: f.viewId,
    });
    expect(r.ok).toBe(false);
  });

  it('základ 25: změna čísla pohne stěnou, ze které kóta vznikla; druhá stojí', () => {
    const f = fixture();
    const [left, , right] = room(f);
    const d = linear(f, left, right);
    f.run('dimension.setValue', { dimensionId: d, value: 5000 });
    expect(f.wall(left).path.start.x).toBeCloseTo(-1000);
    expect(f.wall(right).path.start.x).toBeCloseTo(4000);
    expect(value(f, d)).toBeCloseTo(5000);
  });

  it('základ 25: když je vybraná druhá stěna z dvojice, pohne se ona', () => {
    const f = fixture();
    const [left, , right] = room(f);
    const d = linear(f, left, right);
    f.run('dimension.setValue', { dimensionId: d, value: 3500, moveRef: 1 });
    expect(f.wall(left).path.start.x).toBeCloseTo(0);
    expect(f.wall(right).path.start.x).toBeCloseTo(3500);
  });

  it('základ 25: délková kóta posune uchopený konec', () => {
    const f = fixture();
    const [, top] = room(f);
    const [len] = f.run('dimension.create', {
      kind: 'length',
      ref: { wallId: top, face: 'ref' },
      viewId: f.viewId,
    });
    f.run('dimension.setValue', { dimensionId: len, value: 4500, end: 'start' });
    expect(f.wall(top).path.start.x).toBeCloseTo(-500);
    expect(f.wall(top).path.end.x).toBeCloseTo(4000);
  });

  it('kóty 9: úhlová kóta – změna čísla otočí stěnu, ze které vznikla', () => {
    const f = fixture();
    const [left, top] = room(f);
    const [ang] = f.run('dimension.create', { kind: 'angular', wallIds: [left, top], viewId: f.viewId });
    expect(value(f, ang ?? '')).toBeCloseTo(90);
    f.run('dimension.setValue', { dimensionId: ang, value: 80 });
    expect(value(f, ang ?? '')).toBeCloseTo(80, 1);
    expect(f.wall(top).path.end).toEqual({ x: 4000, y: 3000 });
  });

  it('kóty 10: přepis textu a návrat ke skutečné hodnotě', () => {
    const f = fixture();
    const [left, , right] = room(f);
    const d = linear(f, left, right);
    f.run('dimension.setText', { dimensionId: d, text: 'cca 4 m' });
    expect(f.model.dimensions[d]?.textOverride).toBe('cca 4 m');
    f.run('dimension.setText', { dimensionId: d, text: null });
    expect(f.model.dimensions[d]?.textOverride).toBeNull();
  });

  it('kóty 12: smazání více vybraných kót najednou', () => {
    const f = fixture();
    const [left, , right] = room(f);
    const ids = [linear(f, left, right), linear(f, left, right)];
    f.run('dimension.delete', { dimensionIds: ids });
    expect(Object.keys(f.model.dimensions)).toHaveLength(0);
  });

  it('kóty 4: skupina zarovnání je vlastnost kóty, ne skupina anotací', () => {
    const f = fixture();
    const [left, , right] = room(f);
    const ids = [linear(f, left, right), linear(f, left, right)];
    f.run('dimension.setAlignGroup', { dimensionIds: ids, groupId: 'zarovnani-1' });
    expect(ids.map((id) => f.model.dimensions[id]?.alignGroupId)).toEqual(['zarovnani-1', 'zarovnani-1']);
    expect(f.model.dimensions[ids[0] ?? '']?.annotationLayerId).toBe(f.layer('Kóty a popisky – studie'));
  });

  it('katalog-kresleni / část 3: číslo v mm bez jednotky, desetinná čárka', () => {
    expect(formatLength(1250)).toBe('1250');
    expect(formatLength(12.5)).toBe('12,5');
    expect(formatAngle(45.5)).toBe('45,5°');
  });
});
