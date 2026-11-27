import { describe, expect, it } from 'vitest';
import { buildSample, findSample, sequentialIds, type Model } from '@bim-light/core';
import { fixture } from '../../../../packages/core/src/testing/fixture.ts';
import { clipTriangles } from './clip-triangles.ts';
import { SHEET_OFFSET, surfaceSheets } from './surface-sheets.ts';

/** Plocha trojúhelníků (mm²). */
function area(p: readonly number[]): number {
  let s = 0;
  for (let i = 0; i + 8 < p.length; i += 9) {
    const [ax, ay, az, bx, by, bz, cx, cy, cz] = p.slice(i, i + 9) as number[] as [
      number,
      number,
      number,
      number,
      number,
      number,
      number,
      number,
      number,
    ];
    const [ux, uy, uz, vx, vy, vz] = [bx - ax, by - ay, bz - az, cx - ax, cy - ay, cz - az];
    s += Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx) / 2;
  }
  return s;
}

const type = (m: Model, name: string) => Object.values(m.coveringTypes).find((t) => t.name === name)!.id;

function room() {
  const f = fixture();
  const walls = f.run('wall.rectangle', {
    storeyId: f.storeyId,
    typeId: f.type('Zdivo 300'),
    a: { x: 0, y: 0 },
    b: { x: 4000, y: 3000 },
  });
  const [roomId] = f.run('room.create', { storeyId: f.storeyId, point: { x: 2000, y: 1500 } });
  const view = Object.values(f.model.views3d)[0]!;
  return { f, walls, roomId: roomId!, view };
}

describe('3D náhled / povrchy místností (prvky stavby 9): tenké plochy z jádra', () => {
  it('bez úpravy nic; malba stěn = plocha jako ve výkazu, 1 mm před lícem, barva materiálu', () => {
    const { f, walls, roomId, view } = room();
    const filter = { walls: new Set(walls), storeys: null, only: null };
    expect(surfaceSheets(f.model, view, filter)).toEqual([]);
    f.run('covering.assign', { roomId, place: 'walls', typeId: type(f.model, 'Malba béžová') });
    const sheets = surfaceSheets(f.model, view, filter);
    expect(sheets).toHaveLength(4);
    const total = sheets.reduce((s, x) => s + area(x.positions), 0);
    const r = f.editor.query('covering.surfaces', { roomId });
    const rows = (r.ok ? r.data : []) as { place: string; area: number }[];
    const expected = rows.filter((s) => s.place === 'wall').reduce((s, x) => s + x.area, 0);
    expect(total / 1e6).toBeCloseTo(expected, 1);
    // Vnitřní líc levé stěny je v x = 0 (obdélník stěn jde ven): plocha je o 1 mm dál v místnosti.
    const xOf = (p: readonly number[]) => p.filter((_, i) => i % 3 === 0);
    const left = sheets.map((x) => xOf(x.positions)).find((xs) => Math.max(...xs) < 100)!;
    expect(Math.min(...left)).toBeCloseTo(SHEET_OFFSET, 3);
    expect(sheets[0]!.color).toMatch(/^#/);
    expect(sheets[0]!.opacity).toBe(1);
  });

  it('skrytá stěna, jiné podlaží a výběr F4 povrchy vynechají; podlaha bez stěny jen bez výběru', () => {
    const { f, walls, roomId, view } = room();
    f.run('covering.assign', { roomId, place: 'walls', typeId: type(f.model, 'Malba bílá') });
    f.run('covering.assign', { roomId, place: 'floor', typeId: type(f.model, 'Vinyl dub') });
    const all = { walls: new Set(walls), storeys: null, only: null };
    expect(surfaceSheets(f.model, view, all)).toHaveLength(5);
    expect(surfaceSheets(f.model, view, { ...all, walls: new Set(walls.slice(1)) })).toHaveLength(4);
    expect(surfaceSheets(f.model, view, { ...all, storeys: new Set(['jinde']) })).toHaveLength(0);
    expect(surfaceSheets(f.model, view, { ...all, only: new Set([walls[0]!]) })).toHaveLength(1);
  });

  it('ořezový kvádr ořízne plochu přesně (polovina stěny = polovina plochy)', () => {
    const tri = [0, 0, 0, 1000, 0, 0, 1000, 0, 1000, 0, 0, 0, 1000, 0, 1000, 0, 0, 1000];
    const box = { min: { x: -1, y: -1, z: -1 }, max: { x: 500, y: 1, z: 2000 } };
    expect(area(clipTriangles(tri, box))).toBeCloseTo(500 * 1000, 3);
    expect(clipTriangles(tri, { min: { x: 2000, y: -1, z: -1 }, max: { x: 3000, y: 1, z: 1 } })).toEqual([]);
  });

  it('ukázka 3d-povrchy: v domě jsou povrchy s úpravou (obklad, dlažba, malby)', () => {
    const m = buildSample(findSample('3d-povrchy')!, sequentialIds());
    const view = Object.values(m.views3d)[0]!;
    const walls = new Set(
      Object.values(m.elements)
        .filter((e) => e.category === 'wall')
        .map((e) => e.id),
    );
    const sheets = surfaceSheets(m, view, { walls, storeys: null, only: null });
    expect(new Set(sheets.map((s) => s.color)).size).toBeGreaterThanOrEqual(3);
  });
});
