import { describe, expect, it } from 'vitest';
import { fixture } from '../../testing/fixture.ts';
import { wallGeometry } from '../../wall/geometry.ts';

const faces = (f: ReturnType<typeof fixture>, id: string) => {
  const g = wallGeometry(f.model, f.wall(id));
  return [g.faces.ref.start.y, g.faces.opp.start.y].sort((a, b) => a - b);
};

describe('katalog-kresleni 6.3: referenční čára určuje, kam se stěna rozšíří', () => {
  it('líc: líc zůstane, stěna roste na druhou stranu', () => {
    const f = fixture();
    const id = f.line({ x: 0, y: 0 }, { x: 5000, y: 0 });
    f.run('wall.setThickness', { wallId: id, thickness: 400 });
    expect(faces(f, id)).toEqual([0, 400].map((v) => expect.closeTo(v, 6)));
  });

  it('osa: po přepnutí na osu roste stěna na obě strany stejně', () => {
    const f = fixture();
    const id = f.line({ x: 0, y: 0 }, { x: 5000, y: 0 });
    f.run('wall.setReferenceLine', { wallId: id, referenceLine: 'axis' });
    expect(faces(f, id)).toEqual([0, 300].map((v) => expect.closeTo(v, 6)));
    f.run('wall.setThickness', { wallId: id, thickness: 500 });
    expect(faces(f, id)).toEqual([-100, 400].map((v) => expect.closeTo(v, 6)));
  });

  it('zpět na líc: stěna zůstane na místě', () => {
    const f = fixture();
    const id = f.line({ x: 0, y: 0 }, { x: 5000, y: 0 }, { referenceLine: 'axis' });
    const before = faces(f, id);
    f.run('wall.setReferenceLine', { wallId: id, referenceLine: 'face' });
    expect(faces(f, id)).toEqual(before.map((v) => expect.closeTo(v, 6)));
  });
});
