import { describe, expect, it } from 'vitest';
import { measureDimension } from '../../dimension/measure.ts';
import {
  arcData,
  arcTangent,
  arcThrough,
  arcWithRadius,
  pathLength,
  pointAt,
  tangentAt,
  vec,
} from '../../geometry/index.ts';
import { fixture, near } from '../../testing/fixture.ts';
import { ownerAt } from '../../testing/junction.ts';
import { drawView } from '../../view/draw-view.ts';

const radiusOf = (p: { kind: string }) => arcData(p as Parameters<typeof arcData>[0]).radius;

describe('plan-steny / Z5: stavba oblouku', () => {
  it('třemi body: oblouk prochází prostředním bodem, konce zůstanou', () => {
    const p = arcThrough(vec(0, 0), vec(2000, 1000), vec(4000, 0));
    expect(p.kind).toBe('arc');
    expect(radiusOf(p)).toBeCloseTo(2500, 6);
    expect(near(pointAt(p, 0.5), vec(2000, 1000), 1e-6)).toBe(true);
  });

  it('poloměrem: kladný = střed vlevo (proti směru hodin), krátký poloměr = půlkruh', () => {
    const p = arcWithRadius(vec(0, 0), vec(4000, 0), 2500);
    expect(radiusOf(p)).toBeCloseTo(2500, 6);
    expect(pointAt(p, 0.5).y).toBeLessThan(0);
    expect(radiusOf(arcWithRadius(vec(0, 0), vec(4000, 0), 100))).toBeCloseTo(2000, 6);
  });

  it('tečně: tečna v začátku = směr předchozí stěny', () => {
    const p = arcTangent(vec(0, 0), vec(1, 0), vec(3000, 3000));
    const t = tangentAt(p, 'start');
    expect(t.x).toBeCloseTo(1, 9);
    expect(radiusOf(p)).toBeCloseTo(3000, 6);
  });
});

describe('plan-steny / Z5: Zakřivit a Vyrovnat stěnu', () => {
  it('Zakřivit bodem: konce zůstanou, oblouk prochází bodem; Vyrovnat vrátí úsečku; Undo', () => {
    const f = fixture();
    const w = f.line(vec(0, 0), vec(6000, 0));
    f.run('wall.curve', { wallId: w, through: vec(3000, 1000) });
    const p = f.wall(w).path;
    expect(p.kind).toBe('arc');
    expect(near(p.start, vec(0, 0))).toBe(true);
    expect(near(pointAt(p, 0.5), vec(3000, 1000), 1e-6)).toBe(true);
    f.run('wall.straighten', { wallIds: [w] });
    expect(f.wall(w).path.kind).toBe('line');
    f.editor.undo();
    expect(f.wall(w).path.kind).toBe('arc');
  });

  it('poloměr menší než tloušťka na vnitřní straně se odmítne s vysvětlením', () => {
    const f = fixture();
    const w = f.line(vec(0, 0), vec(400, 0));
    // Zdivo 300 vlevo; střed vlevo ve vzdálenosti 200 → vnitřní líc by měl záporný poloměr.
    const r = f.editor.execute('wall.curve', { wallId: w, radius: 200 });
    expect(r.ok).toBe(false);
    expect(!r.ok && r.error.message).toMatch(/oloměr oblouku/);
  });

  it('napojená stěna v T sklouzne na nový oblouk hostitele', () => {
    const f = fixture();
    const host = f.line(vec(0, 0), vec(6000, 0));
    const t = f.line(vec(3000, -3000), vec(3000, 0), {
      connections: [{ end: 'end', wallId: host, at: 'ATPATH' }],
    });
    f.run('wall.curve', { wallId: host, through: vec(3000, -500) });
    expect(f.wall(t).path.end.y).toBeCloseTo(-500, 3);
  });

  it('otvory drží vzdálenost od začátku; vyrovnání, po kterém se otvor nevejde, se odmítne', () => {
    const f = fixture();
    const w = f.line(vec(0, 0), vec(6000, 0));
    f.run('wall.curve', { wallId: w, through: vec(3000, 2500) });
    const len = pathLength(f.wall(w).path);
    const [o] = f.run('opening.create', {
      wallId: w,
      offset: len - 1200,
      width: 1000,
      height: 1200,
      sill: 900,
    });
    const r = f.editor.execute('wall.straighten', { wallIds: [w] });
    expect(r.ok).toBe(false);
    expect(!r.ok && r.error.message).toMatch(/vyčníval/);
    expect(f.model.openings[o as string]?.offset).toBeCloseTo(len - 1200, 6);
  });
});

describe('plan-steny / Z5: otvor a kóty v oblouku', () => {
  function arcWallWithOpening() {
    const f = fixture();
    const [w] = f.run('wall.create', {
      storeyId: f.storeyId,
      typeId: f.type('Obvodová zateplená 465'),
      // Půlkruh po směru hodin kolem (0, 0), poloměr 5000; vrstvy jdou ven.
      path: { kind: 'arc', start: vec(-5000, 0), end: vec(5000, 0), bulge: -1 },
    });
    const len = pathLength(f.wall(w as string).path);
    const [o] = f.run('opening.create', {
      wallId: w,
      offset: len / 2 - 500,
      width: 1000,
      height: 1200,
      sill: 900,
    });
    return { f, w: w as string, o: o as string, len };
  }

  it('otvor vyřízne všechny vrstvy radiálně: v otvoru nic, vedle otvoru stěna', () => {
    const { f } = arcWallWithOpening();
    // Střed otvoru je nahoře (0, 5000+); polovina úhlu otvoru = 500 / 5000 rad.
    for (const r of [5005, 5150, 5400]) expect(ownerAt(f, vec(0, r))).toBe('');
    const a = 600 / 5000;
    expect(ownerAt(f, vec(5150 * Math.sin(a), 5150 * Math.cos(a)))).not.toBe('');
    // Hrana otvoru je radiální: bod těsně za hranou na vnějším i vnitřním líci je stěna.
    const e = 520 / 5000;
    expect(ownerAt(f, vec(5010 * Math.sin(e), 5010 * Math.cos(e)))).not.toBe('');
    expect(ownerAt(f, vec(5455 * Math.sin(e), 5455 * Math.cos(e)))).not.toBe('');
  });

  it('kóty oblouku: délka oblouku, tětiva a poloměr; změna poloměru a tětivy číslem', () => {
    const f = fixture();
    const w = f.line(vec(0, 0), vec(6000, 0));
    f.run('wall.curve', { wallId: w, radius: -5000 });
    const ref = { wallId: w, face: 'ref' };
    const mk = (measure: string) =>
      f.run('dimension.create', { kind: 'length', ref, measure, viewId: f.viewId })[0] as string;
    const [arcLen, chord, radius] = [mk('arc'), mk('chord'), mk('radius')];
    const val = (id: string) => measureDimension(f.model, f.model.dimensions[id] as never);
    expect(val(chord)).toBeCloseTo(6000, 6);
    expect(val(radius)).toBeCloseTo(5000, 6);
    expect(val(arcLen)).toBeCloseTo(2 * 5000 * Math.asin(0.6), 6);
    const texts = drawView(f.model, f.viewId).primitives.flatMap((p) => (p.kind === 'text' ? [p.text] : []));
    expect(texts).toContain('R 5000');
    f.run('dimension.setValue', { dimensionId: radius, value: 4000 });
    expect(val(radius)).toBeCloseTo(4000, 6);
    expect(val(chord)).toBeCloseTo(6000, 6);
    f.run('dimension.setValue', { dimensionId: chord, value: 5000 });
    expect(val(chord)).toBeCloseTo(5000, 3);
    expect(val(radius)).toBeCloseTo(4000, 3);
  });

  it('tětivu a poloměr přímé stěny nejde kótovat; vyrovnání je smaže', () => {
    const f = fixture();
    const w = f.line(vec(0, 0), vec(6000, 0));
    const bad = f.editor.execute('dimension.create', {
      kind: 'length',
      ref: { wallId: w, face: 'ref' },
      measure: 'radius',
      viewId: f.viewId,
    });
    expect(bad.ok).toBe(false);
    f.run('wall.curve', { wallId: w, radius: 5000 });
    f.run('dimension.create', {
      kind: 'length',
      ref: { wallId: w, face: 'ref' },
      measure: 'radius',
      viewId: f.viewId,
    });
    f.run('wall.straighten', { wallIds: [w] });
    expect(Object.keys(f.model.dimensions)).toHaveLength(0);
  });

  it('Okótovat celou stěnu v oblouku: řetěz po oblouku vnějšího líce (čelo – otvor – otvor – čelo)', () => {
    const { f, w, o } = arcWallWithOpening();
    const ids = f.run('dimension.wholeWall', { wallId: w, side: 'opp', viewId: f.viewId });
    const dims = ids.map((id) => f.model.dimensions[id]);
    expect(dims).toHaveLength(4);
    const vals = dims.map((d) => measureDimension(f.model, d as never));
    const outer = 5465;
    const width = (1000 * outer) / 5000;
    expect(vals[1]).toBeCloseTo(width, 3);
    expect((vals[0] ?? 0) + (vals[1] ?? 0) + (vals[2] ?? 0)).toBeCloseTo(vals[3] ?? 0, 3);
    expect(vals[3]).toBeCloseTo(Math.PI * outer, -1);
    // Změna kóty k otvoru posune otvor po oblouku.
    f.run('dimension.setValue', { dimensionId: ids[0], value: (vals[0] ?? 0) - 200, moveRef: 1 });
    expect(measureDimension(f.model, f.model.dimensions[ids[0] as string] as never)).toBeCloseTo(
      (vals[0] ?? 0) - 200,
      3,
    );
    expect(f.model.openings[o]).toBeDefined();
  });

  it('posun otvoru po obloukové stěně: o vzdálenost po oblouku i vektorem k bodu na oblouku', () => {
    const { f, o, len } = arcWallWithOpening();
    f.run('opening.move', { openingIds: [o], distance: 1000 });
    expect(f.model.openings[o]?.offset).toBeCloseTo(len / 2 + 500, 6);
    // Střed otvoru je teď 1000 / 5000 rad od vrcholu; vektor ho vrátí na vrchol oblouku.
    const a = 1000 / 5000;
    f.run('opening.move', { openingIds: [o], vector: vec(-5000 * Math.sin(a), 5000 - 5000 * Math.cos(a)) });
    expect(f.model.openings[o]?.offset).toBeCloseTo(len / 2 - 500, 3);
  });
});
