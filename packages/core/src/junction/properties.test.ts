import { describe, expect, it } from 'vitest';
import { vec } from '../geometry/index.ts';
import { fixture, room } from '../testing/fixture.ts';
import { ownerAt, wallAt } from '../testing/junction.ts';
import { drawView } from '../view/draw-view.ts';
import { allWallGeometry, wallGeometry } from '../wall/geometry.ts';

function corner() {
  const f = fixture();
  const t = f.type('Obvodová zateplená 465');
  const a = f.line(vec(5000, 0), vec(0, 0), { typeId: t });
  const b = f.line(vec(0, 0), vec(0, 5000), {
    typeId: t,
    connections: [{ end: 'start', wallId: a, at: 'ATEND' }],
  });
  return { f, a, b };
}

const snapshot = (f: ReturnType<typeof fixture>) =>
  JSON.stringify(
    [...allWallGeometry(f.model, f.storeyId).values()].map((g) => [g.layers.map((l) => l.polygons), g.faces]),
  );

describe('plan-steny / Z2: vlastnosti výpočtu napojení', () => {
  it('determinismus: stejný model dá stejný výsledek, i ve zcela novém projektu', () => {
    const one = corner();
    const two = corner();
    expect(snapshot(one.f)).toBe(snapshot(two.f));
    expect(snapshot(one.f)).toBe(snapshot(one.f));
  });

  it('změna tloušťky jedné stěny přepočítá souseda (izolace A dojede k novému líci B)', () => {
    const { f, a, b } = corner();
    expect(ownerAt(f, vec(-590, -460))).toBe('');
    f.run('wall.setThickness', { wallId: b, thickness: 600 });
    expect(wallAt(f, vec(-590, -460))).toBe(a);
    expect(ownerAt(f, vec(-590, -460))).toBe('Tepelná izolace EPS');
  });

  it('změna typu souseda přepočítá roh; jedno Undo vrátí vše', () => {
    const { f, b } = corner();
    const before = snapshot(f);
    f.run('wall.setType', { wallIds: [b], typeId: f.type('Zdivo 300') });
    expect(snapshot(f)).not.toBe(before);
    f.editor.undo();
    expect(snapshot(f)).toBe(before);
  });

  it('základ 24: odpojení konce vztah zruší (volné konce), nové napojení ho vytvoří', () => {
    const { f, a, b } = corner();
    f.run('wall.disconnect', { wallId: b, end: 'start' });
    expect(wallGeometry(f.model, f.wall(a)).cuts.end.join).toBe('free');
    expect(ownerAt(f, vec(-400, -400))).toBe('');
    f.run('wall.connect', { wallId: b, end: 'start', toWallId: a, at: 'ATEND' });
    expect(wallGeometry(f.model, f.wall(a)).cuts.end.join).toBe('corner');
    expect(ownerAt(f, vec(-400, -400))).toBe('Tepelná izolace EPS');
  });

  it('mezipaměť: nezměněná stěna má po příkazu na jiné stěně stejný výsledek (stejný objekt)', () => {
    const { f, a } = corner();
    const other = f.line(vec(10000, 0), vec(12000, 0));
    const g1 = wallGeometry(f.model, f.wall(a)).layers[0]?.polygons;
    f.run('wall.move', { wallIds: [other], vector: { x: 0, y: 100 } });
    expect(wallGeometry(f.model, f.wall(a)).layers[0]?.polygons).toBe(g1);
  });
});

describe('plan-steny / Z2: kresba rohů ve třech podrobnostech', () => {
  it('místnost ve Studii: sjednocený obrys = dvě uzavřené smyčky (vnější a vnitřní), žádná jiná čára', () => {
    const f = fixture();
    room(f);
    const lines = drawView(f.model, f.viewId).primitives.filter((p) => p.kind === 'line');
    expect(lines).toHaveLength(2);
    expect(lines.every((p) => p.kind === 'line' && p.closed && p.points.length === 4)).toBe(true);
  });

  it('místnost v Projektu: stejný materiál v rozích bez čáry pokosu', () => {
    const f = fixture();
    room(f);
    f.run('view.setStyle', { viewId: f.viewId, styleId: f.style('Projekt') });
    const lines = drawView(f.model, f.viewId).primitives.filter((p) => p.kind === 'line');
    expect(lines.every((p) => p.source.role === 'obrys')).toBe(true);
    expect(lines).toHaveLength(2);
  });

  it('různé materiály v rohu: v Projektu tenká čára pokosu (hranice vrstvy), ve Studii ne', () => {
    const f = fixture();
    const a = f.line(vec(5000, 0), vec(0, 0));
    f.line(vec(0, 0), vec(0, 5000), {
      typeId: f.type('ŽB stěna 200'),
      connections: [{ end: 'start', wallId: a, at: 'ATEND' }],
    });
    const roles = () =>
      drawView(f.model, f.viewId)
        .primitives.filter((p) => p.kind === 'line')
        .map((p) => p.source.role);
    expect(roles()).not.toContain('hranice vrstvy');
    f.run('view.setStyle', { viewId: f.viewId, styleId: f.style('Projekt') });
    expect(roles()).toContain('hranice vrstvy');
  });

  it('volná stěna má jeden uzavřený obrys včetně čel', () => {
    const f = fixture();
    f.line(vec(0, 0), vec(5000, 0));
    const lines = drawView(f.model, f.viewId).primitives.filter((p) => p.kind === 'line');
    expect(lines).toHaveLength(1);
    expect(lines[0]?.kind === 'line' && lines[0].closed).toBe(true);
  });
});
