import { describe, expect, it } from 'vitest';
import { vec } from '../geometry/index.ts';
import { fixture, room } from '../testing/fixture.ts';
import { allWallGeometry } from '../wall/geometry.ts';
import { dimensionLine, snapDimensionLine, withLineThrough } from './align.ts';
import { temporaryDimensions } from './temporary.ts';
import type { LengthDimension } from './types.ts';

function setup() {
  const f = fixture();
  const ids = room(f);
  const geoms = allWallGeometry(f.model);
  return { f, ids, geoms, all: [...geoms.values()] };
}

describe('katalog-kresleni / část 3: dočasné kóty', () => {
  it('[R] 3: měří se k lícům – příčně k nejbližšímu líci na každé straně, podélně délka', () => {
    const { ids, geoms, all } = setup();
    const t = temporaryDimensions(geoms.get(ids[0])!, all);
    const cross = t.filter((x) => x.kind === 'cross');
    expect(cross.length).toBe(1);
    expect(cross[0]).toMatchObject({ value: 4000, other: { wallId: ids[2], face: 'ref' }, parallel: true });
    const len = t.find((x) => x.kind === 'length');
    expect(len?.value).toBeCloseTo(3000, 6);
  });

  it('oprava 2026-11-26: líce různé délky (roh jen na jednom konci) – příčná kóta je kolmo k líci, ne šikmo', () => {
    const f = fixture();
    // horní stěna s rohem jen vpravo: vnitřní líc je kratší než vnější, středy líců nejsou proti sobě
    const top = f.line(vec(0, 4000), vec(4000, 4000));
    f.line(vec(4000, 4000), vec(4000, 0), { connections: [{ end: 'start', wallId: top, at: 'ATEND' }] });
    const bottom = f.line(vec(-1000, 0), vec(5000, 0));
    const geoms = allWallGeometry(f.model);
    for (const mode of ['face', 'axis'] as const) {
      const cross = temporaryDimensions(geoms.get(top)!, [...geoms.values()], mode).filter(
        (x) => x.kind === 'cross',
      );
      expect(cross.length).toBeGreaterThan(0);
      for (const c of cross) {
        if (c.kind !== 'cross') continue;
        expect(c.to.x - c.from.x).toBeCloseTo(0, 6);
        expect(c.value).toBeCloseTo(Math.abs(c.to.y - c.from.y), 6);
      }
    }
    const toBottom = temporaryDimensions(geoms.get(top)!, [...geoms.values()]).find(
      (x) => x.kind === 'cross' && x.other.wallId === bottom,
    );
    expect(toBottom?.value).toBeCloseTo(4000 - 300, 6);
  });

  it('3.2: osa je dostupná přepnutím', () => {
    const { ids, geoms, all } = setup();
    const t = temporaryDimensions(geoms.get(ids[0])!, all, 'axis');
    expect(t.find((x) => x.kind === 'cross')?.value).toBeCloseTo(4300, 6);
  });
});

describe('pravidla-interakce / kóty 3, 7: poloha čáry a zarovnání', () => {
  it('kóta se nese na myši: čára prochází bodem', () => {
    const { f, ids } = setup();
    const [id] = f.run('dimension.create', {
      kind: 'linear',
      refs: [
        { wallId: ids[0], face: 'ref' },
        { wallId: ids[2], face: 'ref' },
      ],
      viewId: f.viewId,
    });
    const d = withLineThrough(f.model, f.model.dimensions[id!]!, vec(1000, 2200));
    const l = dimensionLine(f.model, d)!;
    expect(l.start.y).toBeCloseTo(2200, 6);
  });

  it('kóty 3: čára se přichytí k rovnoběžné kótě poblíž a ukáže vodítko', () => {
    const { f, ids } = setup();
    const [a] = f.run('dimension.create', {
      kind: 'length',
      ref: { wallId: ids[1], face: 'ref' },
      offset: -800,
      viewId: f.viewId,
    });
    const moving = { ...(f.model.dimensions[a!] as LengthDimension), id: 'x', offset: 0 };
    const all = Object.values(f.model.dimensions);
    const s = snapDimensionLine(f.model, moving, vec(500, 2205), all, 20, new Set(['x']));
    expect(s.alignWith).toBe(a);
    expect(s.point.y).toBeCloseTo(2200, 6);
    expect(s.guide).not.toBeNull();
    const none = snapDimensionLine(f.model, moving, vec(500, 1500), all, 20, new Set(['x']));
    expect(none.alignWith).toBeNull();
  });
});
