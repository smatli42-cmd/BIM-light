import { describe, expect, it } from 'vitest';
import { vec, type Vec2 } from '../geometry/index.ts';
import type { Id } from '../ids/index.ts';
import { fixture, type Fixture } from '../testing/fixture.ts';
import { pointInPolygon } from '../selection/pick.ts';
import { layersArea, outlineArea, ownerAt, wallAt } from '../testing/junction.ts';
import { drawView } from '../view/draw-view.ts';
import { allWallGeometry, wallGeometry } from '../wall/geometry.ts';

const arc = (start: Vec2, end: Vec2, sweepDeg: number) => ({
  kind: 'arc',
  start,
  end,
  bulge: Math.tan((sweepDeg * Math.PI) / 180 / 4),
});

function arcWall(
  f: Fixture,
  start: Vec2,
  end: Vec2,
  sweepDeg: number,
  extra: Record<string, unknown> = {},
): Id {
  const [id] = f.run('wall.create', {
    storeyId: f.storeyId,
    typeId: f.type('Zdivo 300'),
    path: arc(start, end, sweepDeg),
    ...extra,
  });
  return id as Id;
}

/** Žádný bod v okolí uzlu nepatří dvěma vrstvám najednou. */
function noOverlap(f: Fixture, center: Vec2, size = 1200, step = 37) {
  const polys = [...allWallGeometry(f.model, f.storeyId).values()].flatMap((g) =>
    g.layers.flatMap((l) => l.polygons),
  );
  for (let x = -size; x <= size; x += step)
    for (let y = -size; y <= size; y += step) {
      const p = vec(center.x + x, center.y + y);
      const n = polys.filter((poly) => pointInPolygon(p, poly)).length;
      expect(n, `překryv v ${p.x}, ${p.y}`).toBeLessThanOrEqual(1);
    }
}

/** Součet ploch vrstev = plocha obrysu u každé stěny (žádné mezery ani překryvy uvnitř stěny). */
function areasMatch(f: Fixture) {
  for (const g of allWallGeometry(f.model, f.storeyId).values())
    expect(layersArea(g)).toBeCloseTo(outlineArea(g), -1);
}

const lines = (f: Fixture) => drawView(f.model, f.viewId).primitives.filter((p) => p.kind === 'line');

/** Kruhová stěna ze dvou půlkruhů (proti směru hodin), napojených v přímce v obou uzlech. */
function ring(f: Fixture, r: number, type: string) {
  const t = f.type(type);
  const a = arcWall(f, vec(r, 0), vec(-r, 0), 180, { typeId: t });
  const b = arcWall(f, vec(-r, 0), vec(r, 0), 180, {
    typeId: t,
    connections: [
      { end: 'start', wallId: a, at: 'ATEND' },
      { end: 'end', wallId: a, at: 'ATSTART' },
    ],
  });
  return { a, b };
}

describe('plan-steny / Z5: napojení oblouků', () => {
  it('kruhová stěna ze dvou oblouků: napojení v přímce, ve Studii dva soustředné obrysy', () => {
    const f = fixture();
    const { a } = ring(f, 5000, 'Obvodová zateplená 465');
    const g = wallGeometry(f.model, f.wall(a));
    expect(g.cuts.start.join).toBe('straight');
    expect(g.cuts.end.join).toBe('straight');
    const ls = lines(f);
    expect(ls).toHaveLength(2);
    expect(ls.every((p) => p.kind === 'line' && p.closed)).toBe(true);
    areasMatch(f);
  });

  it('kruhová stěna se třemi vrstvami: v Projektu jen obrys a hranice materiálů, uzel bez čáry', () => {
    const f = fixture();
    ring(f, 5000, 'Obvodová zateplená 465');
    f.run('view.setStyle', { viewId: f.viewId, styleId: f.style('Projekt') });
    const ls = lines(f);
    expect(ls.every((p) => p.kind === 'line' && p.closed)).toBe(true);
    expect(ls.filter((p) => p.source.role === 'obrys')).toHaveLength(2);
    // Omítka | zdivo | EPS: dvě hranice materiálů, každá jedna uzavřená kružnice (bez zubu v uzlu).
    expect(ls.filter((p) => p.source.role === 'hranice vrstvy')).toHaveLength(2);
  });

  it('vrstvy kruhové stěny leží na soustředných kružnicích (chyba tětivy do 1 mm)', () => {
    const f = fixture();
    const { a } = ring(f, 5000, 'Obvodová zateplená 465');
    const g = wallGeometry(f.model, f.wall(a));
    for (const l of g.layers)
      for (const poly of l.polygons)
        for (const p of poly) {
          const r = Math.hypot(p.x, p.y);
          const radii = [l.span.from, l.span.to].map((o) => 5000 - o);
          const d = Math.min(...radii.map((q) => Math.abs(q - r)));
          expect(d).toBeLessThanOrEqual(1);
        }
  });

  it('roh L přímka – oblouk, stejná skladba: bez překryvu, plochy sedí, roh ve Studii jeden obrys', () => {
    const f = fixture();
    const t = f.type('Obvodová zateplená 465');
    const a = f.line(vec(-5000, 0), vec(0, 0), { typeId: t });
    arcWall(f, vec(0, 0), vec(4000, 4000), -90, {
      typeId: t,
      connections: [{ end: 'start', wallId: a, at: 'ATEND' }],
    });
    expect(wallGeometry(f.model, f.wall(a)).cuts.end.join).toBe('corner');
    noOverlap(f, vec(0, 0));
    areasMatch(f);
    expect(lines(f)).toHaveLength(1);
  });

  it('roh L oblouk – oblouk s různými poloměry a skladbami: bez překryvu, roh vyplněný', () => {
    const f = fixture();
    const a = arcWall(f, vec(-6000, -6000), vec(0, 0), 60, { typeId: f.type('Obvodová zateplená 465') });
    arcWall(f, vec(0, 0), vec(3000, 3000), 90, {
      typeId: f.type('ŽB stěna 200'),
      connections: [{ end: 'start', wallId: a, at: 'ATEND' }],
    });
    expect(wallGeometry(f.model, f.wall(a)).cuts.end.join).toBe('corner');
    noOverlap(f, vec(0, 0));
    areasMatch(f);
  });

  it('T: přímá příčka na obloukové stěně – jádro příčky dojede k jádru hostitele, bez překryvu', () => {
    const f = fixture();
    const t = f.type('Obvodová zateplená 465');
    // Po směru hodin: vrstvy jdou ven, referenční čára = vnitřní líc omítky (poloměr 5000).
    const host = arcWall(f, vec(-5000, 0), vec(5000, 0), -180, { typeId: t });
    const part = f.line(vec(0, 1000), vec(0, 5000), {
      typeId: f.type('Příčka 100'),
      connections: [{ end: 'end', wallId: host, at: 'ATPATH' }],
    });
    noOverlap(f, vec(0, 5000));
    areasMatch(f);
    // V omítce hostitele (r = 5007) je jádro příčky; omítka hostitele jinde zůstane (mezera jen u uzlu).
    expect(wallAt(f, vec(-50, 5007))).toBe(part);
    expect(ownerAt(f, vec(-50, 5007))).toBe(ownerAt(f, vec(-50, 4000)));
    expect(ownerAt(f, vec(5007 * Math.sin(0.9), 5007 * Math.cos(0.9)))).toBe('Omítka');
  });

  it('T: oblouková stěna končí na přímé stěně, bez překryvu', () => {
    const f = fixture();
    const host = f.line(vec(-6000, 0), vec(6000, 0));
    arcWall(f, vec(0, 3000), vec(0, 0), 90, {
      typeId: f.type('Příčka 125'),
      connections: [{ end: 'end', wallId: host, at: 'ATPATH' }],
    });
    noOverlap(f, vec(0, 0));
    areasMatch(f);
  });

  it('kříž X: přímá stěna přes oblouk – žádný překryv, mezera jen v uzlu', () => {
    const f = fixture();
    const a = arcWall(f, vec(5000, 0), vec(-5000, 0), 180, { typeId: f.type('ŽB stěna 200') });
    const b = f.line(vec(0, 2000), vec(0, 8000), { typeId: f.type('Příčka 100') });
    f.run('wall.cross', { wallId: a, toWallId: b });
    noOverlap(f, vec(0, 5000));
    areasMatch(f);
    // ŽB (vyšší priorita) projede příčkou celou.
    expect(ownerAt(f, vec(0, 5000 - 100))).toContain('beton');
  });

  it('volný konec oblouku: obrys uzavřený, omítky zahnou přes čelo', () => {
    const f = fixture();
    const a = arcWall(f, vec(3000, 0), vec(0, 3000), 90, { typeId: f.type('Obvodová zateplená 465') });
    const g = wallGeometry(f.model, f.wall(a));
    expect(g.cuts.start.join).toBe('free');
    expect(g.outlines).toHaveLength(1);
    areasMatch(f);
  });

  it('U: přímé stěny napojené pod úhlem na oblouk přes 180° – izolace pokosem, bez zubu a bez výplně kruhu', () => {
    const f = fixture();
    const t = f.type('Obvodová zateplená 465');
    const x = -Math.sqrt(1850 * 1850 - 1600 * 1600);
    const sweep = -(2 * Math.PI - 2 * Math.atan2(1600, -x));
    const a = f.line(vec(-6000, 1600), vec(x, 1600), { typeId: t, side: 'right' });
    const [b] = f.run('wall.create', {
      storeyId: f.storeyId,
      typeId: t,
      side: 'right',
      path: { kind: 'arc', start: vec(x, 1600), end: vec(x, -1600), bulge: Math.tan(sweep / 4) },
      connections: [{ end: 'start', wallId: a, at: 'ATEND' }],
    });
    f.line(vec(x, -1600), vec(-6000, -1600), {
      typeId: t,
      side: 'right',
      connections: [{ end: 'start', wallId: b, at: 'ATEND' }],
    });
    expect(wallGeometry(f.model, f.wall(a)).cuts.end.join).toBe('corner');
    noOverlap(f, vec(x, 1300), 600, 23);
    areasMatch(f);
    // Vnitřní roh je vyplněný izolací (dříve zub), střed kruhu zůstane prázdný (dříve výplň).
    expect(ownerAt(f, vec(-850, 1150))).toBe('Tepelná izolace EPS');
    expect(ownerAt(f, vec(0, 0))).toBe('');
  });

  it('oprava 2026-11-26: přímá stěna plynule do oblouku (malý úhel) – omítka i izolace pokosem, bez mezery', () => {
    for (const sweep of [-20, 20]) {
      const f = fixture();
      const t = f.type('Obvodová zateplená 465');
      const a = f.line(vec(-5000, 0), vec(0, 0), { typeId: t });
      arcWall(f, vec(0, 0), vec(5000, sweep < 0 ? 1500 : -300), sweep, {
        typeId: t,
        connections: [{ end: 'start', wallId: a, at: 'ATEND' }],
      });
      noOverlap(f, vec(0, 200), 700, 23);
      areasMatch(f);
      // Dříve se vrstva na vnější straně zalomení zastavila na druhém (vzdáleném) průsečíku s kružnicí.
      const faces = wallGeometry(f.model, f.wall(a)).faces;
      expect(Math.max(faces.ref.end.x, faces.opp.end.x)).toBeLessThan(100);
      expect(ownerAt(f, vec(-300, 7))).toBe('Omítka');
      expect(ownerAt(f, vec(-300, 390))).toBe('Tepelná izolace EPS');
    }
  });
});
