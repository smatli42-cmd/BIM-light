import { describe, expect, it } from 'vitest';
import { resolveHeight } from '../model/height.ts';
import { fixture, type Fixture } from '../testing/fixture.ts';
import { specOf } from '../commands/wall/instantiate.ts';
import { wallHeight } from './resolve.ts';

/** 1.NP (±0, 3000) + 2.NP (3000, 3000) + 3.NP (6000, 2800). */
function house(): Fixture & { s2: string; s3: string } {
  const f = fixture();
  const [s2] = f.run('storey.create', { name: '2.NP', elevation: 3000, height: 3000 });
  const [s3] = f.run('storey.create', { name: '3.NP', elevation: 6000, height: 2800 });
  return Object.assign(f, { s2: s2 as string, s3: s3 as string });
}

const heightOf = (f: Fixture, id: string) => resolveHeight(f.model, f.wall(id).height);
const line = (f: Fixture, extra: Record<string, unknown> = {}) =>
  f.line({ x: 0, y: 0 }, { x: 5000, y: 0 }, extra);
const top = (storeys: number, offset = 0) => ({ kind: 'storey', storeys, offset });

describe('plan-steny / Z3: výška stěny vázaná na podlaží (základ 12)', () => {
  it('plan-steny / Z3: nová stěna má vršek na podlaží + 1 (výška podlaží)', () => {
    const f = house();
    const id = line(f);
    expect(f.wall(id).height.top).toEqual(top(1));
    expect(heightOf(f, id)).toEqual({ bottom: 0, top: 3000 });
  });

  it('plan-steny / Z3: změna výšky 1.NP o 100 mm změní výšku stěn a posune podlaží nad ním', () => {
    const f = house();
    const a = line(f);
    const b = f.line({ x: 0, y: 0 }, { x: 0, y: 4000 }, { storeyId: f.s2 });
    f.run('storey.update', { storeyId: f.storeyId, height: 3100 });
    expect(heightOf(f, a)).toEqual({ bottom: 0, top: 3100 });
    expect(f.model.storeys[f.s2]?.elevation).toBe(3100);
    expect(f.model.storeys[f.s3]?.elevation).toBe(6100);
    expect(heightOf(f, b)).toEqual({ bottom: 3100, top: 6100 });
  });

  it('plan-steny / Z3: stěna přes dvě podlaží = vršek na podlaží + 2', () => {
    const f = house();
    const id = line(f, { height: { baseStoreyId: f.storeyId, baseOffset: 0, top: top(2, -250) } });
    expect(heightOf(f, id)).toEqual({ bottom: 0, top: 5750 });
    f.run('storey.update', { storeyId: f.s2, height: 3200 });
    expect(heightOf(f, id).top).toBe(5950);
  });

  it('plan-steny / Z3: nad nejvyšším podlažím je ještě jeho vršek (úroveň + výška)', () => {
    const f = house();
    const id = f.line({ x: 0, y: 0 }, { x: 5000, y: 0 }, { storeyId: f.s3 });
    expect(heightOf(f, id)).toEqual({ bottom: 6000, top: 8800 });
    const r = f.editor.execute('wall.setHeight', { wallIds: [id], height: { baseOffset: 0, top: top(2) } });
    expect(r.ok).toBe(false);
  });

  it('plan-steny / Z3: odsazení dole i nahoře (kladné i záporné)', () => {
    const f = house();
    const id = line(f);
    f.run('wall.setHeight', { wallIds: [id], height: { baseOffset: -300, top: top(1, -200) } });
    expect(heightOf(f, id)).toEqual({ bottom: -300, top: 2800 });
    expect(wallHeight(f.model, f.wall(id)).height).toBe(3100);
  });

  it('plan-steny / Z3: pevná výška („nespojeno“) se změnou podlaží nemění výšku, jen polohu', () => {
    const f = house();
    const id = f.line({ x: 0, y: 0 }, { x: 5000, y: 0 }, { storeyId: f.s2 });
    f.run('wall.setHeight', {
      wallIds: [id],
      height: { baseOffset: 100, top: { kind: 'height', value: 1200 } },
    });
    f.run('storey.update', { storeyId: f.storeyId, height: 3500 });
    expect(heightOf(f, id)).toEqual({ bottom: 3600, top: 4800 });
  });

  it('plan-steny / Z3: N = 0 jen s kladným odsazením; nulová nebo záporná výška se odmítne', () => {
    const f = house();
    const id = line(f);
    const set = (h: unknown) => f.editor.execute('wall.setHeight', { wallIds: [id], height: h });
    expect(set({ baseOffset: 0, top: top(0) }).ok).toBe(false);
    expect(set({ baseOffset: 0, top: top(0, 900) }).ok).toBe(true);
    expect(heightOf(f, id)).toEqual({ bottom: 0, top: 900 });
    expect(set({ baseOffset: 0, top: { kind: 'height', value: 0 } }).ok).toBe(false);
    expect(set({ baseOffset: 0, top: top(-1) }).ok).toBe(false);
  });

  it('plan-steny / Z3: změna úrovně podlaží posune i podlaží nad ním, spodní podlaží změní výšku', () => {
    const f = house();
    f.run('storey.update', { storeyId: f.s2, elevation: 3300 });
    expect(f.model.storeys[f.storeyId]?.height).toBe(3300);
    expect(f.model.storeys[f.s3]?.elevation).toBe(6300);
    expect(f.editor.execute('storey.update', { storeyId: f.s2, elevation: -10 }).ok).toBe(false);
  });

  it('plan-steny / Z3: kopie na jiné podlaží si nese vazbu výšky vůči novému podlaží', () => {
    const f = house();
    const id = line(f, { height: { baseStoreyId: f.storeyId, baseOffset: 50, top: top(1, -100) } });
    const [copy] = f.run('wall.paste', {
      storeyId: f.s2,
      walls: [specOf(f.wall(id))],
    });
    expect(f.wall(copy as string).height.baseStoreyId).toBe(f.s2);
    expect(heightOf(f, copy as string)).toEqual({ bottom: 3050, top: 5900 });
  });
});
