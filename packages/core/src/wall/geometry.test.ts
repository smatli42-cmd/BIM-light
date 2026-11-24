import { describe, expect, it } from 'vitest';
import { arcData, pathLength, type Path } from '../geometry/index.ts';
import { fixture, near, room } from '../testing/fixture.ts';
import { wallGeometry } from './geometry.ts';

const geom = (f: ReturnType<typeof fixture>, id: string) => wallGeometry(f.model, f.wall(id));

describe('katalog-kresleni / část 1 a rozhodnutí 5: líce a tloušťka', () => {
  it('část 1: tloušťka jde doleva od směru kreslení, referenční čára = vnitřní líc', () => {
    const f = fixture();
    const g = geom(f, f.line({ x: 0, y: 0 }, { x: 5000, y: 0 }));
    expect(g.faces.ref.start.y).toBeCloseTo(0);
    expect(g.faces.opp.start.y).toBeCloseTo(300);
    expect(g.section.thickness).toBe(300);
  });

  it('část 1: mezerník přehodí stranu tloušťky, referenční čára zůstane', () => {
    const f = fixture();
    const id = f.line({ x: 0, y: 0 }, { x: 5000, y: 0 });
    f.run('wall.flipSide', { wallIds: [id] });
    const g = geom(f, id);
    expect(g.faces.ref.start.y).toBeCloseTo(0);
    expect(g.faces.opp.start.y).toBeCloseTo(-300);
  });

  it('rozhodnutí 5: referenční čára osa a líc jádra', () => {
    const f = fixture();
    const axis = geom(f, f.line({ x: 0, y: 0 }, { x: 5000, y: 0 }, { referenceLine: 'axis' }));
    expect([axis.faces.ref.start.y, axis.faces.opp.start.y]).toEqual([-150, 150]);
    const core = geom(
      f,
      f.line(
        { x: 0, y: 1000 },
        { x: 5000, y: 1000 },
        { referenceLine: 'core-face', typeId: f.type('Obvodová zateplená 465') },
      ),
    );
    expect(core.faces.ref.start.y).toBeCloseTo(985);
    expect(core.faces.opp.start.y).toBeCloseTo(1450);
    expect(core.layers).toHaveLength(3);
    expect(core.layers.every((l) => l.polygons.length === 1)).toBe(true);
  });

  it('katalog-kresleni / část 6.3: přepnutí referenční čáry stěnu nepohne', () => {
    const f = fixture();
    const id = f.line({ x: 0, y: 0 }, { x: 5000, y: 0 });
    const before = geom(f, id).outline;
    f.run('wall.setReferenceLine', { wallId: id, referenceLine: 'axis' });
    expect(geom(f, id).outline.every((p, i) => near(p, before[i] ?? p))).toBe(true);
    expect(f.wall(id).path.start.y).toBeCloseTo(150);
  });
});

describe('základ 24: napojení stěn je uložený vztah (rohy, T napojení)', () => {
  it('roh: líce se protnou, vnější roh je uzavřený', () => {
    const f = fixture();
    const [left, top] = room(f);
    const l = geom(f, left);
    const t = geom(f, top);
    expect(near(l.faces.opp.end, { x: -300, y: 3300 })).toBe(true);
    expect(near(t.faces.opp.start, { x: -300, y: 3300 })).toBe(true);
    expect(near(l.faces.ref.end, { x: 0, y: 3000 })).toBe(true);
    expect(pathLength(t.faces.ref)).toBeCloseTo(4000);
    expect(pathLength(t.faces.opp)).toBeCloseTo(4600);
    expect(l.cuts.end.join).toBe('corner');
  });

  it('bez uloženého vztahu se roh nedělá, i když se konce trefí do stejného bodu', () => {
    const f = fixture();
    const a = f.line({ x: 0, y: 0 }, { x: 0, y: 3000 });
    f.line({ x: 0, y: 3000 }, { x: 4000, y: 3000 });
    expect(geom(f, a).cuts.end.join).toBe('free');
    expect(near(geom(f, a).faces.opp.end, { x: -300, y: 3000 })).toBe(true);
  });

  it('T napojení: konec stěny se utne na bližším líci hostitele', () => {
    const f = fixture();
    const host = f.line({ x: 0, y: 0 }, { x: 6000, y: 0 });
    const down = f.line(
      { x: 3000, y: 0 },
      { x: 3000, y: -3000 },
      {
        connections: [{ end: 'start', wallId: host, at: 'ATPATH' }],
      },
    );
    const up = f.line(
      { x: 1000, y: 0 },
      { x: 1000, y: 3000 },
      {
        connections: [{ end: 'start', wallId: host, at: 'ATPATH' }],
      },
    );
    expect(geom(f, down).cuts.start.join).toBe('tee');
    expect(geom(f, down).faces.ref.start.y).toBeCloseTo(0);
    expect(geom(f, up).faces.ref.start.y).toBeCloseTo(300);
    expect(geom(f, up).faces.opp.start.y).toBeCloseTo(300);
  });

  it('základ 23: oblouková stěna má soustředné líce a napojí se rohem', () => {
    const f = fixture();
    // Čtvrtkruh R 3000 se středem v počátku, z (3000,0) do (0,3000), proti směru hodin.
    const arcPath: Path = {
      kind: 'arc',
      start: { x: 3000, y: 0 },
      end: { x: 0, y: 3000 },
      bulge: Math.tan(Math.PI / 8),
    };
    const arc = f.line({ x: 0, y: 0 }, { x: 1, y: 0 }, { path: arcPath });
    const g = geom(f, arc);
    const radius = (p: Path) => arcData(p as Extract<Path, { kind: 'arc' }>).radius;
    expect(radius(g.faces.ref)).toBeCloseTo(3000);
    expect(radius(g.faces.opp)).toBeCloseTo(2700);
    const straight = f.line(
      { x: 0, y: 3000 },
      { x: -2000, y: 3000 },
      {
        connections: [{ end: 'start', wallId: arc, at: 'ATEND' }],
      },
    );
    // Přímka navazuje na oblouk tečně, je tedy „v přímce“ (kolmý řez), plan-steny / Z2.
    expect(geom(f, straight).cuts.start.join).toBe('straight');
    expect(geom(f, arc).cuts.end.join).toBe('straight');
  });
});
