import { describe, expect, it } from 'vitest';
import { vec } from '../../geometry/index.ts';
import { fixture, near } from '../../testing/fixture.ts';
import { allWalls, connectionsOf } from '../../wall/queries.ts';

describe('katalog-kresleni / část 5: uzel', () => {
  it('[R] 5: odpojený konec se po přitažení k uzlu jiné stěny napojí', () => {
    const f = fixture();
    const a = f.line(vec(0, 0), vec(3000, 0));
    const b = f.line(vec(3500, 500), vec(3500, 3000));
    f.run('wall.moveEndpoint', {
      wallId: b,
      end: 'start',
      point: vec(3000, 0),
      connectTo: { wallId: a, at: 'ATEND' },
    });
    expect(near(f.wall(b).path.start, vec(3000, 0))).toBe(true);
    expect(connectionsOf(f.model, b).length).toBe(1);
  });

  it('5: Smazat uzel sloučí dvě stěny stejného typu v jedné přímce', () => {
    const f = fixture();
    const a = f.line(vec(0, 0), vec(4000, 0));
    f.run('wall.split', { wallId: a, point: vec(1500, 0) });
    expect(allWalls(f.model).length).toBe(2);
    f.run('wall.deleteNode', { wallId: a, end: 'end' });
    expect(allWalls(f.model).length).toBe(1);
    expect(near(f.wall(a).path.end, vec(4000, 0))).toBe(true);
  });

  it('5: Smazat uzel odmítne stěny, které nejsou v přímce', () => {
    const f = fixture();
    const a = f.line(vec(0, 0), vec(4000, 0));
    f.line(vec(4000, 0), vec(4000, 3000), { connections: [{ end: 'start', wallId: a, at: 'ATEND' }] });
    expect(f.editor.execute('wall.deleteNode', { wallId: a, end: 'end' }).ok).toBe(false);
  });
});

describe('pravidla-interakce / kóty 12: Del smaže vybrané stěny i kóty najednou', () => {
  it('jeden krok Undo', () => {
    const f = fixture();
    const a = f.line(vec(0, 0), vec(0, 3000));
    const b = f.line(vec(4000, 0), vec(4000, 3000));
    const c = f.line(vec(8000, 0), vec(8000, 3000));
    const [d] = f.run('dimension.create', {
      kind: 'linear',
      refs: [
        { wallId: b, face: 'ref' },
        { wallId: c, face: 'ref' },
      ],
      viewId: f.viewId,
    });
    f.run('selection.delete', { wallIds: [a], dimensionIds: [d] });
    expect(allWalls(f.model).length).toBe(2);
    expect(Object.keys(f.model.dimensions).length).toBe(0);
    f.editor.undo();
    expect(allWalls(f.model).length).toBe(3);
    expect(Object.keys(f.model.dimensions).length).toBe(1);
  });
});
