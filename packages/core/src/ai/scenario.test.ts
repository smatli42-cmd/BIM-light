// Scénář „AI kreslí dům“: jen JSON volání nástrojů podle toolDescriptions, žádná obrazovka.
// Každá nová funkce stěn a kót přidá krok sem (pravidlo v CLAUDE.md).
import { describe, expect, it } from 'vitest';
import { aiClient } from '../testing/ai-client.ts';

interface Info {
  storeys: { id: string }[];
  wallTypes: { id: string; name: string; thickness: number }[];
  views: { id: string }[];
}
interface WallRow {
  id: string;
  length: number;
  thickness: number;
  ends: { start: string; end: string };
  connections: { own: string; otherWallId: string; other: string }[];
}
interface DimRow {
  id: string;
  value: number;
}

function start() {
  const ai = aiClient();
  const info = ai.call<Info>('project.info');
  const storeyId = info.storeys[0]!.id;
  const typeId = info.wallTypes.find((t) => t.name === 'Zdivo 300')!.id;
  const viewId = info.views[0]!.id;
  return { ai, storeyId, typeId, viewId };
}

/** Místnost 6000 × 4000 po vnitřním líci, po směru hodin (tloušťka ven). Vrací [levá, horní, pravá, spodní]. */
function room(c: ReturnType<typeof start>) {
  const points = [
    { x: 0, y: 0 },
    { x: 0, y: 4000 },
    { x: 6000, y: 4000 },
    { x: 6000, y: 0 },
  ];
  return c.ai.call<string[]>('wall.chain', { storeyId: c.storeyId, typeId: c.typeId, points, closed: true });
}

const row = (rows: WallRow[], id: string) => rows.find((r) => r.id === id)!;

describe('AI scénář: místnost, příčka, stěna s volným koncem, kóta', () => {
  it('uzavřený řetěz = 4 stěny napojené v rozích', () => {
    const c = start();
    const ids = room(c);
    expect(ids).toHaveLength(4);
    const walls = c.ai.call<WallRow[]>('wall.list', { storeyId: c.storeyId });
    expect(walls.every((w) => w.ends.start === 'corner' && w.ends.end === 'corner')).toBe(true);
    expect(walls.map((w) => w.length).sort()).toEqual([4000, 4000, 6000, 6000]);
  });

  it('příčka mezi dvěma stěnami se napojí na obou koncích v T (jako myší)', () => {
    const c = start();
    const [, top, , bottom] = room(c);
    const [mid] = c.ai.call<string[]>('wall.chain', {
      storeyId: c.storeyId,
      typeId: c.typeId,
      points: [
        { x: 3000, y: 0 },
        { x: 3000, y: 4000 },
      ],
    });
    const w = row(c.ai.call<WallRow[]>('wall.list'), mid!);
    expect(w.ends).toEqual({ start: 'tee', end: 'tee' });
    expect(w.connections.map((x) => [x.otherWallId, x.other]).sort()).toEqual(
      [
        [bottom, 'ATPATH'],
        [top, 'ATPATH'],
      ].sort(),
    );
  });

  it('stěna s volným koncem, kóta k jejímu čelu, změna čísla kóty stěnu zkrátí', () => {
    const c = start();
    const [, , , bottom] = room(c);
    const [free] = c.ai.call<string[]>('wall.create', {
      storeyId: c.storeyId,
      typeId: c.typeId,
      path: { kind: 'line', start: { x: 1000, y: 4000 }, end: { x: 1000, y: 1500 } },
      autoConnect: true,
    });
    const detail = c.ai.call<{ ends: { start: string; end: string }; caps: { end: { length: number } } }>(
      'wall.get',
      { wallId: free },
    );
    expect(detail.ends).toEqual({ start: 'tee', end: 'free' });
    expect(detail.caps.end.length).toBe(300);
    const [dim] = c.ai.call<string[]>('dimension.create', {
      kind: 'linear',
      refs: [
        { wallId: bottom, face: 'ref' },
        { wallId: free, face: 'end' },
      ],
      viewId: c.viewId,
    });
    expect(c.ai.call<DimRow[]>('dimension.list').find((d) => d.id === dim)?.value).toBe(1500);
    c.ai.call('dimension.setValue', { dimensionId: dim, value: 2000, moveRef: 1 });
    expect(c.ai.call<DimRow[]>('dimension.list').find((d) => d.id === dim)?.value).toBe(2000);
    expect(row(c.ai.call<WallRow[]>('wall.list'), free!).length).toBe(2000);
  });

  it('zobrazení přes AI: přepnutí stylu, skrytí vrstvy, „upraveno“ a Vrátit', () => {
    const c = start();
    interface ViewRow {
      style: { name: string };
      modified: boolean;
      detail: string;
      layers: { id: string; name: string; visible: boolean }[];
    }
    const info = c.ai.call<{ styles: { id: string; name: string }[] }>('project.info');
    const projekt = info.styles.find((s) => s.name === 'Projekt')!.id;
    c.ai.call('view.setStyle', { viewId: c.viewId, styleId: projekt });
    const v = c.ai.call<ViewRow>('view.info', { viewId: c.viewId });
    expect([v.style.name, v.detail, v.modified]).toEqual(['Projekt', 'medium', false]);
    const walls = v.layers.find((l) => l.name === 'Stěny a sloupy')!;
    c.ai.call('view.setLayerState', { viewId: c.viewId, layerId: walls.id, visible: false });
    expect(c.ai.call<ViewRow>('view.info', { viewId: c.viewId }).modified).toBe(true);
    c.ai.call('view.resetToStyle', { viewId: c.viewId });
    const back = c.ai.call<ViewRow>('view.info', { viewId: c.viewId });
    expect(back.modified).toBe(false);
    expect(back.layers.find((l) => l.id === walls.id)?.visible).toBe(true);
  });

  it('změna tloušťky a referenční čáry přes AI', () => {
    const c = start();
    const [left] = room(c);
    c.ai.call('wall.setReferenceLine', { wallId: left, referenceLine: 'axis' });
    c.ai.call('wall.setThickness', { wallId: left, thickness: 450 });
    const w = row(c.ai.call<WallRow[]>('wall.list'), left!);
    expect(w.thickness).toBe(450);
  });

  it('typ stěny přes AI: vlastní skladba, přiřazení stěně, smazání s náhradou (plán stěn Z1)', () => {
    interface TypeRow {
      id: string;
      name: string;
      thickness: number;
      usage: number;
    }
    const c = start();
    const [left] = room(c);
    const mats = c.ai.call<{ id: string; name: string }[]>('material.list');
    const m = (name: string) => mats.find((x) => x.name === name)!.id;
    const [typeId] = c.ai.call<string[]>('wallType.create', {
      name: 'Obvod AI',
      layers: [
        { materialId: m('Omítka'), thickness: 15, function: 'finish' },
        { materialId: m('Zdivo keramické'), thickness: 300, function: 'core' },
        { materialId: m('Tepelná izolace EPS'), thickness: 200, function: 'insulation' },
      ],
    });
    c.ai.call('wall.setType', { wallIds: [left], typeId });
    const t = c.ai.call<TypeRow[]>('wallType.list').find((x) => x.id === typeId)!;
    expect([t.thickness, t.usage]).toEqual([515, 1]);
    expect(row(c.ai.call<WallRow[]>('wall.list'), left!).thickness).toBe(515);
    c.ai.call('wallType.delete', { typeId, replacementId: c.typeId });
    expect(row(c.ai.call<WallRow[]>('wall.list'), left!).thickness).toBe(300);
  });

  it('napojení vrstev přes AI: obrys vrstev v rohu, kříž, nespojovat (plán stěn Z2)', () => {
    interface LayerRow {
      material: string;
      area: number;
    }
    const c = start();
    const [left, top] = room(c);
    const layers = (id: string) => c.ai.call<{ layers: LayerRow[] }>('wall.get', { wallId: id }).layers;
    expect(layers(left!)[0]!.area).toBeGreaterThan(0);
    const [a] = c.ai.call<string[]>('wall.create', {
      storeyId: c.storeyId,
      typeId: c.typeId,
      path: { kind: 'line', start: { x: 3000, y: 1000 }, end: { x: 3000, y: 3000 } },
    });
    const [b] = c.ai.call<string[]>('wall.create', {
      storeyId: c.storeyId,
      typeId: c.typeId,
      path: { kind: 'line', start: { x: 2000, y: 2000 }, end: { x: 4000, y: 2000 } },
    });
    const before = layers(a!)[0]!.area;
    c.ai.call('wall.cross', { wallId: a, toWallId: b });
    expect(layers(a!)[0]!.area).toBeLessThan(before);
    c.ai.call('wall.setJoin', { wallId: top, end: 'start', join: false });
    const w = row(c.ai.call<WallRow[]>('wall.list'), top!);
    expect(w.ends.start).toBe('free');
  });

  it('výška a podlaží přes AI: stěna přes dvě podlaží, změna výšky 1.NP, smazání podlaží (plán stěn Z3)', () => {
    interface HeightRow {
      id: string;
      bottom: number;
      top: number;
      wallHeight: number;
    }
    const c = start();
    const [left] = room(c);
    const [s2] = c.ai.call<string[]>('storey.create', { name: '2.NP', elevation: 3000, height: 3000 });
    const h = () => c.ai.call<HeightRow[]>('wall.list').find((w) => w.id === left)!;
    expect(h()).toMatchObject({ bottom: 0, top: 3000 });
    c.ai.call('wall.setHeight', {
      wallIds: [left],
      height: { baseOffset: 0, top: { kind: 'storey', storeys: 2, offset: -200 } },
    });
    expect(h()).toMatchObject({ top: 5800, wallHeight: 5800 });
    c.ai.call('storey.update', { storeyId: c.storeyId, height: 3100 });
    expect(h().top).toBe(5900);
    expect(() => c.ai.call('storey.delete', { storeyId: s2 })).toThrow(/prvků/);
  });

  it('otvory přes AI: otvor, výřez, niky, kóty celé stěny, odmítnutí (plán stěn Z4)', () => {
    const c = start();
    const [, top] = room(c);
    const [o] = c.ai.call<string[]>('opening.create', { wallId: top, offset: 1000, width: 1200 });
    c.ai.call('opening.create', { wallId: top, offset: 4000, width: 800, kind: 'niche', depth: 100 });
    const list = c.ai.call<{ id: string; plan: string; offset: number }[]>('opening.list', { wallId: top });
    expect(list.map((x) => [x.offset, x.plan])).toEqual([
      [1000, 'cut'],
      [4000, 'cut'],
    ]);
    const dims = c.ai.call<string[]>('dimension.wholeWall', { wallId: top, side: 'ref', viewId: c.viewId });
    const rows = c.ai.call<DimRow[]>('dimension.list');
    expect(dims.map((d) => rows.find((r) => r.id === d)!.value)).toEqual([1000, 1200, 1800, 800, 1200, 6000]);
    expect(c.ai.raw('opening.move', { openingIds: [o], distance: 5000 }).error?.message).toMatch(/vyčníval/);
    c.ai.call('opening.delete', { openingIds: [o] });
    expect(c.ai.call<unknown[]>('opening.list')).toHaveLength(1);
  });
});
