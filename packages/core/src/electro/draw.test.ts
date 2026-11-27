import { describe, expect, it } from 'vitest';
import { resolveGraphics } from '../style/graphics.ts';
import { drawView } from '../view/draw-view.ts';
import { electroFacts } from './draw-view.ts';
import { bbox, electroFixture, primitivesOf, T, texts } from './test-helpers.ts';

type F = ReturnType<typeof electroFixture>;
const onWall = (f: F, extra: Record<string, unknown> = {}) =>
  f.run('electro.create', {
    typeId: T('socket'),
    wallId: f.wallId,
    offset: 1000,
    side: 'ref',
    ...extra,
  })[0] ?? '';

describe('koncepce 3 Elektro: značka v půdorysu', () => {
  it('značka stojí na líci stěny a míří kolmo do místnosti (na obě strany stěny)', () => {
    const f = electroFixture();
    const a = bbox(primitivesOf(f, onWall(f)));
    const b = bbox(primitivesOf(f, onWall(f, { side: 'opp' })));
    expect(a.y1).toBeCloseTo(-150);
    expect(a.y0).toBeLessThan(-300);
    expect(b.y0).toBeCloseTo(150);
    expect(b.y1).toBeGreaterThan(300);
    expect((a.x0 + a.x1) / 2).toBeCloseTo(1000);
  });

  it('svislá stěna: značka se otočí s líci (kolmo k líci), text zůstane čitelný', () => {
    const f = electroFixture();
    const w = f.line({ x: 0, y: 1000 }, { x: 0, y: 5000 }, { referenceLine: 'axis' });
    const [id] = f.run('electro.create', { typeId: T('thermostat'), wallId: w, offset: 2000, side: 'ref' });
    const ps = primitivesOf(f, id ?? '');
    const b = bbox(ps.filter((p) => p.kind === 'line'));
    expect(b.y1 - b.y0).toBeGreaterThan(b.x1 - b.x0);
    const t = ps.find((p) => p.kind === 'text');
    expect(t?.kind === 'text' && Math.abs(t.angle)).toBeCloseTo(Math.PI / 2);
  });

  it('základ 29: velikost značky je na papíře – v 1:100 je v modelu dvakrát větší, výška textu stejná', () => {
    const f = electroFixture();
    const id = f.run('electro.create', { typeId: T('thermostat'), wallId: f.wallId, offset: 1000 })[0] ?? '';
    const h50 = bbox(primitivesOf(f, id));
    f.run('view.setScale', { viewId: f.viewId, scale: 100 });
    const ps = primitivesOf(f, id);
    expect(bbox(ps).x1 - bbox(ps).x0).toBeCloseTo(2 * (h50.x1 - h50.x0));
    expect(ps.find((p) => p.kind === 'text')).toMatchObject({ heightMm: 0.45 * 4 });
  });

  it('popisek výšky jen když se výška liší od výchozí výšky typu; označení vždy', () => {
    const f = electroFixture();
    expect(texts(primitivesOf(f, onWall(f, { mark: 'Z1' })))).toEqual(['Z1']);
    expect(texts(primitivesOf(f, onWall(f, { mark: 'Z1', height: 300 })))).toEqual(['Z1']);
    expect(texts(primitivesOf(f, onWall(f, { mark: 'Z1', height: 1150 })))).toEqual(['Z1', '+1150']);
    const [up] = f.run('electro.create', { typeId: T('socket2-1150'), wallId: f.wallId, offset: 3000 });
    expect(texts(primitivesOf(f, up ?? ''))).toEqual([]);
  });

  it('základ 5: hrubá podrobnost bez popisků, značka zůstane', () => {
    const f = electroFixture();
    const id = onWall(f, { mark: 'Z1', height: 1150 });
    f.run('view.setDetail', { viewId: f.viewId, detail: 'coarse' });
    expect(texts(primitivesOf(f, id))).toEqual([]);
    expect(primitivesOf(f, id).length).toBeGreaterThan(0);
  });

  it('Ardit „Značka v půdorysu“: odsazení v mm na papíře a odkazová čára k místu osazení', () => {
    const f = electroFixture();
    const id = onWall(f, { symbol: { along: 10, out: 4 } });
    const leader = primitivesOf(f, id).find((p) => p.source.role === 'odkazová čára elektro');
    const pts = leader?.kind === 'line' ? leader.points.map((p) => [Math.round(p.x), Math.round(p.y)]) : [];
    expect(pts).toEqual([
      [1000, -150],
      [1500, -350],
    ]);
  });

  it('rámeček: vlastní sloty instance (zásuvka, zásuvka, datová, anténní) vedle sebe po líci', () => {
    const f = electroFixture();
    const one = bbox(primitivesOf(f, onWall(f)));
    const four = bbox(
      primitivesOf(f, onWall(f, { slots: ['socket', 'socket', 'data', 'tv'], offset: 3000 })),
    );
    expect(four.x1 - four.x0).toBeGreaterThan(3.9 * (one.x1 - one.x0));
  });

  it('rozvaděč ve skutečné velikosti 600 × 150 na líci; zapuštění ho posune do stěny', () => {
    const f = electroFixture();
    const [rh] = f.run('electro.create', {
      typeId: T('board-main'),
      wallId: f.wallId,
      offset: 3000,
      mark: 'RH',
    });
    const body = () => bbox(primitivesOf(f, rh ?? '').filter((p) => p.kind !== 'text'));
    const b = body();
    expect([b.x0, b.x1, b.y0, b.y1].map(Math.round)).toEqual([2700, 3300, -300, -150]);
    f.run('electro.update', { elementId: rh, board: { recess: 100 } });
    expect(body().y1).toBeCloseTo(-50);
    expect(texts(primitivesOf(f, rh ?? ''))).toEqual(['RH']);
  });

  it('liniové svítidlo má délku v mm modelu (nezávisle na měřítku)', () => {
    const f = electroFixture();
    const p = { typeId: T('lamp-linear'), storeyId: f.storeyId, point: { x: 2000, y: 2000 } };
    const [l] = f.run('electro.create', p);
    const b = bbox(primitivesOf(f, l ?? ''));
    expect(b.x1 - b.x0).toBeCloseTo(1200);
  });
});

describe('koncepce 4, základ 11: grafika elektro prvků', () => {
  it('barva skupiny legendy je výchozí grafika (patro 1): zásuvka červeně, spínač oranžově, data modře', () => {
    const f = electroFixture();
    const stroke = (type: string) => {
      const [id] = f.run('electro.create', { typeId: T(type), wallId: f.wallId, offset: 500 });
      const p = primitivesOf(f, id ?? '').find((x) => x.kind === 'line');
      return p?.kind === 'line' ? p.stroke : null;
    };
    expect(stroke('socket')).toMatchObject({ color: '#d32f2f', pen: 2 });
    expect(stroke('switch1')?.color).toBe('#ef8a00');
    expect(stroke('data')?.color).toBe('#0288d1');
    const el = Object.values(f.model.electroElements)[0];
    const view = f.model.views[f.viewId];
    const why = el && view && resolveGraphics(f.model.display, view, electroFacts(f.model, el)).why;
    expect(why && why.lineColor.source).toBe('skupina Silnoproud');
  });

  it('rámeček (Ardit): každý slot má barvu své skupiny – zásuvky červeně, datová modře, anténní fialově', () => {
    const f = electroFixture();
    const id = onWall(f, { slots: ['socket', 'data', 'tv'] });
    const colors = primitivesOf(f, id).flatMap((p) => (p.kind === 'line' ? [p.stroke.color] : []));
    expect(new Set(colors)).toEqual(new Set(['#d32f2f', '#0288d1', '#6a3fbf']));
  });

  it('styl Elektro: stavba šedě bez šraf (pravidlo „Elektro – stavba šedě“), elektro barevně', () => {
    const f = electroFixture();
    const wall = drawView(f.model, f.viewId).primitives.filter((p) => p.source.elementId === f.wallId);
    expect(wall.some((p) => p.kind === 'hatch')).toBe(false);
    const lines = wall.filter((p) => p.kind === 'line');
    expect(lines.length).toBeGreaterThan(0);
    expect(lines.every((p) => p.kind === 'line' && p.stroke.color === '#9a9a9a')).toBe(true);
  });

  it('Studie a Projekt elektro skryjí (vrstva Elektro), v Elektru je vidět', () => {
    for (const style of ['Studie', 'Projekt']) {
      const f = electroFixture(style);
      expect(primitivesOf(f, onWall(f))).toEqual([]);
    }
    const f = electroFixture();
    expect(primitivesOf(f, onWall(f)).length).toBeGreaterThan(0);
  });

  it('fáze: bouraný prvek se ve fázi „plánovaný stav“ skryje stejně jako stavba', () => {
    const f = electroFixture();
    const id = onWall(f, { status: 'demolished' });
    const phase = Object.values(f.model.display.overrideCombinations).find(
      (c) => c.name === 'Fáze – plánovaný stav',
    );
    f.run('view.setPhaseFilter', { viewId: f.viewId, filterId: phase?.id });
    expect(primitivesOf(f, id)).toEqual([]);
  });
});
