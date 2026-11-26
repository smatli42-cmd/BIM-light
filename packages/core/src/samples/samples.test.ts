import { describe, expect, it } from 'vitest';
import { checkWalls } from '../check/walls.ts';
import { sequentialIds } from '../ids/index.ts';
import { visibleWalls } from '../view/visible-walls.ts';
import { wallGeometry } from '../wall/geometry.ts';
import { buildSample, findSample, SAMPLES } from './index.ts';

const build = (key: string) => buildSample(findSample(key)!, sequentialIds());

describe('pokyn uživatele 2026-11-26: ukázky se postaví příkazy v aktuální verzi modelu', () => {
  for (const s of SAMPLES)
    it(`ukázka „${s.title}“ se postaví bez odmítnutého příkazu`, () => {
      const m = buildSample(s, sequentialIds());
      expect(Object.keys(m.elements).length).toBeGreaterThan(0);
    });

  it('klíče ukázek jsou jedinečné, popis říká, co zkusit', () => {
    expect(new Set(SAMPLES.map((s) => s.key)).size).toBe(SAMPLES.length);
    for (const s of SAMPLES) expect(s.description.length).toBeGreaterThan(40);
  });

  it('Rodinný dům: dvě podlaží, rekonstrukce, otvory, kóty a značky; kontrola bez varování', () => {
    const m = build('dum');
    expect(Object.keys(m.storeys)).toHaveLength(2);
    const statuses = new Set(Object.values(m.elements).map((w) => w.status));
    expect([...statuses].sort()).toEqual(['demolished', 'existing', 'new']);
    expect(Object.values(m.openings).map((o) => o.status)).toEqual(
      expect.arrayContaining(['new', 'demolished']),
    );
    expect(Object.keys(m.dimensions).length).toBeGreaterThan(0);
    expect(Object.keys(m.wallTags).length).toBeGreaterThan(0);
    expect(checkWalls(m)).toEqual([]);
  });

  it('scéna Z10 vybouraný úsek: v plánovaném stavu je nová stěna napojená v přímce', () => {
    const m = build('z10-vybourani');
    const view = Object.values(m.views)[0]!;
    const vis = visibleWalls(m, view).model;
    for (const w of Object.values(vis.elements)) {
      const g = wallGeometry(vis, w);
      expect([g.cuts.start.join, g.cuts.end.join]).toContain('straight');
    }
  });

  it('scéna Z10 kontrola: tři varování (překryv, nenapojený konec, krátká stěna)', () => {
    expect(
      checkWalls(build('z10-kontrola'))
        .map((i) => i.kind)
        .sort(),
    ).toEqual(['overlap', 'short', 'unconnected']);
  });
});
