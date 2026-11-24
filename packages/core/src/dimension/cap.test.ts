import { describe, expect, it } from 'vitest';
import { pathLength } from '../geometry/index.ts';
import { pickFace } from '../selection/pick.ts';
import { fixture, room } from '../testing/fixture.ts';
import { allWallGeometry, wallGeometry } from '../wall/geometry.ts';
import { drawView } from '../view/draw-view.ts';
import { measureDimension } from './measure.ts';

/** Stěna zdola nahoru do prostoru (volný horní konec) a svislá stěna vlevo od ní. */
function scene() {
  const f = fixture();
  const wall = f.line({ x: 2000, y: 0 }, { x: 2000, y: 3000 });
  const other = f.line({ x: 0, y: 0 }, { x: 0, y: 5000 });
  const top = f.line({ x: 0, y: 5000 }, { x: 4000, y: 5000 });
  return { f, wall, other, top };
}

describe('závada: kóta k nepřipojenému konci stěny (čelo)', () => {
  it('čelo volného konce jde vybrat jako hrana pro kótu, čelo v rohu ne', () => {
    const f = fixture();
    const free = f.line({ x: 2000, y: 0 }, { x: 2000, y: 3000 });
    const geoms = [...allWallGeometry(f.model, f.storeyId).values()];
    const hit = pickFace(geoms, { x: 1900, y: 3002 }, 20, ['ref', 'opp', 'start', 'end']);
    expect(hit).toMatchObject({ wallId: free, face: 'end' });
    const g = fixture();
    room(g);
    const rg = [...allWallGeometry(g.model, g.storeyId).values()];
    const corner = pickFace(rg, { x: -150, y: -150 }, 5, ['start', 'end']);
    expect(corner).toBeNull();
  });

  it('kóta mezi čelem volného konce a rovnoběžným lícem měří vzdálenost', () => {
    const { f, wall, top } = scene();
    const [id] = f.run('dimension.create', {
      kind: 'linear',
      refs: [
        { wallId: wall, face: 'end' },
        { wallId: top, face: 'ref' },
      ],
      viewId: f.viewId,
    });
    const d = f.model.dimensions[id as string]!;
    expect(measureDimension(f.model, d)).toBeCloseTo(2000, 6);
    const texts = drawView(f.model, f.viewId).primitives.filter((p) => p.kind === 'text');
    expect(texts.some((t) => t.kind === 'text' && t.text === '2000')).toBe(true);
  });

  it('změna čísla kóty k čelu prodlouží stěnu na volném konci', () => {
    const { f, wall, top } = scene();
    const [id] = f.run('dimension.create', {
      kind: 'linear',
      refs: [
        { wallId: top, face: 'ref' },
        { wallId: wall, face: 'end' },
      ],
      ownerRef: 1,
      viewId: f.viewId,
    });
    f.run('dimension.setValue', { dimensionId: id, value: 1500 });
    const d = f.model.dimensions[id as string]!;
    expect(measureDimension(f.model, d)).toBeCloseTo(1500, 6);
    expect(pathLength(wallGeometry(f.model, f.wall(wall)).faces.ref)).toBeCloseTo(3500, 6);
  });

  it('délkovou kótu na čelo vytvořit nejde', () => {
    const { f, wall } = scene();
    const r = f.editor.execute('dimension.create', {
      kind: 'length',
      ref: { wallId: wall, face: 'end' },
      viewId: f.viewId,
    });
    expect(r.ok).toBe(false);
  });
});
