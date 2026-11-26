import { describe, expect, it } from 'vitest';
import { vec } from '../geometry/index.ts';
import { fixture } from '../testing/fixture.ts';
import { elementInfo } from './element-info.ts';

describe('koncepce-rozhrani / 2 I: karta prvku po podržení myši', () => {
  it('stěna: délka, tloušťka, výška, plocha boku a čistá plocha bez průchozího otvoru, vrstva', () => {
    const f = fixture();
    const a = f.line(vec(0, 0), vec(9000, 0));
    f.run('opening.create', { wallId: a, offset: 1000, width: 1000, height: 2000, sill: 0 });
    const info = elementInfo(f.model, a);
    expect(info?.kind).toBe('wall');
    if (info?.kind !== 'wall') return;
    expect(info.length).toBe(9000);
    expect(info.height).toBe(3000);
    expect(info.sideArea).toBe(27);
    expect(info.sideAreaNet).toBe(25);
    expect(info.openings).toBe(1);
    expect(info.storeyName).toBe('1.NP');
    expect(info.thickness).toBeGreaterThan(0);
    expect(info.typeName).not.toBe('');
    expect(info.layerName).not.toBe('');
  });

  it('otvor: rozměry, parapet a typ hostitele; neznámé id = null', () => {
    const f = fixture();
    const a = f.line(vec(0, 0), vec(5000, 0));
    const [o] = f.run('opening.create', { wallId: a, offset: 1000, width: 1200, height: 1500, sill: 900 });
    const info = elementInfo(f.model, o as string);
    expect(info).toMatchObject({
      kind: 'opening',
      width: 1200,
      height: 1500,
      sill: 900,
      openingKind: 'through',
    });
    expect(elementInfo(f.model, 'nic')).toBeNull();
  });
});
