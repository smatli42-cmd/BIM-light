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

  it('změna tloušťky a referenční čáry přes AI', () => {
    const c = start();
    const [left] = room(c);
    c.ai.call('wall.setReferenceLine', { wallId: left, referenceLine: 'axis' });
    c.ai.call('wall.setThickness', { wallId: left, thickness: 450 });
    const w = row(c.ai.call<WallRow[]>('wall.list'), left!);
    expect(w.thickness).toBe(450);
  });
});
