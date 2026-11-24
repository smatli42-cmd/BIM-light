import { describe, expect, it } from 'vitest';
import { allConnections } from '../../wall/queries.ts';
import { fixture, room } from '../../testing/fixture.ts';
import { rulesFor } from '../../rules/cross-rules.ts';

describe('katalog-kresleni / část 6: tloušťka a typ stěny', () => {
  it('část 6: nová tloušťka vytvoří nový typ, změní se jen tato stěna', () => {
    const f = fixture();
    const a = f.line({ x: 0, y: 0 }, { x: 5000, y: 0 });
    const b = f.line({ x: 0, y: 2000 }, { x: 5000, y: 2000 });
    const [newType] = f.run('wall.setThickness', { wallId: a, thickness: 450 });
    expect(f.model.wallTypes[newType ?? '']?.name).toBe('Zdivo 450');
    expect(f.wall(a).typeId).toBe(newType);
    expect(f.wall(b).typeId).toBe(f.type('Zdivo 300'));
    expect(f.wall(a).path.start.y).toBe(0);
  });

  it('část 6: existující typ se stejnou skladbou se přiřadí, nový se nevytvoří', () => {
    const f = fixture();
    const a = f.line({ x: 0, y: 0 }, { x: 5000, y: 0 });
    const types = Object.keys(f.model.wallTypes).length;
    const created = f.run('wall.setThickness', { wallId: a, thickness: 125 });
    expect(created).toEqual([]);
    expect(f.wall(a).typeId).toBe(f.type('Příčka 125'));
    expect(Object.keys(f.model.wallTypes)).toHaveLength(types);
  });

  it('rozhodnutí 5: u vícevrstvé stěny se mění jádro, povrchy zůstanou', () => {
    const f = fixture();
    const a = f.line({ x: 0, y: 0 }, { x: 5000, y: 0 }, { typeId: f.type('Obvodová zateplená 465') });
    const [t] = f.run('wall.setThickness', { wallId: a, thickness: 515 });
    const layers = f.model.wallTypes[t ?? '']?.bands[0]?.layers.map((l) => l.thickness);
    expect(layers).toEqual([15, 350, 150]);
  });
});

describe('katalog-kresleni / část 5: rozdělení, napojení a mazání', () => {
  it('část 5.3: rozdělení stěny dá dvě stěny spojené rohem, napojení na konci přejde na druhou', () => {
    const f = fixture();
    const [, top, right] = room(f);
    const [second] = f.run('wall.split', { wallId: top, point: { x: 1500, y: 3100 } });
    expect(f.wall(top).path.end).toEqual({ x: 1500, y: 3000 });
    expect(f.wall(second ?? '').path).toEqual({
      kind: 'line',
      start: { x: 1500, y: 3000 },
      end: { x: 4000, y: 3000 },
    });
    const toRight = allConnections(f.model).find(
      (c) =>
        [c.relating.wallId, c.related.wallId].includes(right) &&
        [c.relating.wallId, c.related.wallId].includes(second ?? ''),
    );
    expect(toRight).toBeTruthy();
    f.run('wall.offset', { wallId: second ?? '', distance: 500 });
    expect(f.wall(right).path.start.y).toBe(3500);
    expect(f.wall(top).path.end.y).toBe(3500);
  });

  it('část 5.3: bod rozdělení mimo stěnu se odmítne', () => {
    const f = fixture();
    const a = f.line({ x: 0, y: 0 }, { x: 5000, y: 0 });
    expect(f.editor.execute('wall.split', { wallId: a, point: { x: 7000, y: 0 } }).ok).toBe(false);
  });

  it('základ 7: smazání stěny smaže i její kóty a napojení podle tabulky průřezových pravidel', () => {
    const f = fixture();
    const [left, top, right] = room(f);
    f.run('dimension.create', {
      kind: 'linear',
      refs: [
        { wallId: left, face: 'ref' },
        { wallId: right, face: 'ref' },
      ],
      viewId: f.viewId,
    });
    f.run('dimension.create', { kind: 'length', ref: { wallId: top, face: 'ref' }, viewId: f.viewId });
    expect(rulesFor('wall').onDelete).toEqual(['dimensions', 'connections']);
    f.run('wall.delete', { wallIds: [left] });
    expect(Object.values(f.model.dimensions)).toHaveLength(1);
    expect(allConnections(f.model).some((c) => c.relating.wallId === left || c.related.wallId === left)).toBe(
      false,
    );
  });

  it('základ 24: napojení uložené dodatečně příkazem a jeho zrušení', () => {
    const f = fixture();
    const a = f.line({ x: 0, y: 0 }, { x: 0, y: 3000 });
    const b = f.line({ x: 0, y: 3000 }, { x: 4000, y: 3000 });
    f.run('wall.connect', { wallId: b, end: 'start', toWallId: a, at: 'ATEND' });
    expect(allConnections(f.model)).toHaveLength(1);
    f.run('wall.disconnect', { wallId: a, end: 'end' });
    expect(allConnections(f.model)).toHaveLength(0);
  });

  it('základ 2: změna stavu stěny (stávající / bourání / nový)', () => {
    const f = fixture();
    const a = f.line({ x: 0, y: 0 }, { x: 5000, y: 0 });
    f.run('wall.setProperties', { wallIds: [a], status: 'demolished' });
    expect(f.wall(a).status).toBe('demolished');
    expect(f.editor.execute('wall.setProperties', { wallIds: [a], status: 'zbořeno' }).ok).toBe(false);
  });
});
