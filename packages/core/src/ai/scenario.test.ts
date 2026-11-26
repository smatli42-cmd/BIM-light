// Scénář „AI kreslí dům“: jen JSON volání nástrojů podle toolDescriptions, žádná obrazovka.
// Každá nová funkce stěn a kót přidá krok sem nebo do scenario-walls.test.ts (pravidlo v CLAUDE.md).
import { describe, expect, it } from 'vitest';
import { room, row, start } from './scenario-helpers.ts';
import type { DimRow, WallRow } from './scenario-helpers.ts';

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

  it('pohledy a hledání přes AI: uložit pohled, přejmenovat, najít stěny podle typu (koncepce rozhraní UI3)', () => {
    interface ViewRow {
      id: string;
      name: string;
      saved: boolean;
    }
    const c = start();
    const [left] = room(c);
    const [v] = c.ai.call<string[]>('view.save', { viewId: c.viewId, name: 'DSP půdorys' });
    c.ai.call('view.rename', { viewId: v, name: 'PPS půdorys' });
    const views = c.ai.call<{ views: ViewRow[] }>('project.info').views;
    expect(views.map((x) => [x.name, x.saved])).toContainEqual(['PPS půdorys', true]);
    expect(views.find((x) => x.id === c.viewId)?.saved).toBe(false);
    const found = c.ai.call<{ walls: string[] }>('element.find', { categories: ['wall'] });
    expect(found.walls).toContain(left);
    const none = c.ai.call<{ walls: string[] }>('element.find', { thickness: { min: 1000 } });
    expect(none.walls).toEqual([]);
  });
});

describe('AI scénář: karta prvku (koncepce rozhraní, 2 I)', () => {
  it('element.info vrátí stejný souhrn stěny, jaký ukáže karta po podržení myši', () => {
    const c = start();
    const [left] = room(c);
    const info = c.ai.call<{ kind: string; length: number; sideArea: number }>('element.info', {
      elementId: left,
    });
    expect(info.kind).toBe('wall');
    expect(info.length).toBeGreaterThan(0);
    expect(info.sideArea).toBeGreaterThan(0);
  });
});

describe('AI scénář: Změnit velikost (Ctrl+K)', () => {
  it('wall.scale zvětší místnost o 10 % kolem rohu, délky stěn se změní, tloušťka ne', () => {
    const c = start();
    const ids = room(c);
    const before = c.ai.call<WallRow[]>('wall.list', { storeyId: c.storeyId });
    c.ai.call('wall.scale', { wallIds: ids, origin: { x: 0, y: 0 }, factor: 1.1 });
    const after = c.ai.call<WallRow[]>('wall.list', { storeyId: c.storeyId });
    expect(after.map((w) => w.length).sort()).toEqual(
      before.map((w) => Math.round(w.length * 11) / 10).sort(),
    );
    expect(after.map((w) => w.thickness)).toEqual(before.map((w) => w.thickness));
  });
});

describe('AI scénář: kresba stěn a „proč“ (plan-steny / Z6)', () => {
  it('filtr rekonstrukce Bourací práce: element.graphics řekne, že barvu určilo pravidlo; styl zapne značku osy', () => {
    const c = start();
    const [left] = room(c);
    c.ai.call('wall.setProperties', { wallIds: [left], status: 'demolished' });
    const info = c.ai.call<{ views: { id: string; saved: boolean }[] }>('project.info', {});
    const viewId = info.views.find((v) => !v.saved)!.id;
    const vi = c.ai.call<{ phaseFilters: { id: string; name: string }[] }>('view.info', { viewId });
    const phase = vi.phaseFilters.find((x) => x.name === 'Fáze – bourací práce')!;
    c.ai.call('view.setPhaseFilter', { viewId, filterId: phase.id });
    const g = c.ai.call<{ why: { lineColor: { level: number; source: string } } }>('element.graphics', {
      elementId: left,
      viewId,
    });
    expect(g.why.lineColor).toMatchObject({ level: 3, source: 'Bourání žlutě čárkovaně' });
    const styleId = c.ai.call<{ style: { id: string } }>('view.info', { viewId }).style.id;
    c.ai.call('style.setWallDrawing', { styleId, refLine: true });
    const after = c.ai.call<{ effect: { refLine: boolean } }>('element.graphics', {
      elementId: left,
      viewId,
    });
    expect(after.effect.refLine).toBe(true);
  });
});
