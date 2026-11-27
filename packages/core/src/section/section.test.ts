import { describe, expect, it } from 'vitest';
import { fixture } from '../testing/fixture.ts';
import { lineIntervals, sectionCutPlane3d, sectionFrame } from './frame.ts';
import { projectV30toV31 } from './migrate-v30.ts';
import { nextSectionMark, type Section } from './types.ts';
import { compassSide } from './elevations.ts';

const line = { start: { x: 3000, y: -2000 }, end: { x: 3000, y: 2000 } };
const pts = [line.start, line.end];

describe('rozhodnutí 19: řez jako druh pohledu', () => {
  it('rozhodnutí 19: pohled doleva – osa výkresu jde od startu, doprava od konce (pravá ruka pozorovatele)', () => {
    const left = sectionFrame({ points: pts, direction: 'left', depth: null });
    expect(left.look).toEqual({ x: -1, y: 0 });
    expect(left.origin).toEqual(line.start);
    const right = sectionFrame({ points: pts, direction: 'right', depth: 5000 });
    expect(right.look.x).toBeCloseTo(1);
    expect(right.origin).toEqual(line.end);
    expect(right.right.y).toBeCloseTo(-1);
    expect(left.depth).toBe(Number.POSITIVE_INFINITY);
  });

  it('rozhodnutí 19: úseky přímky řezu v obrysu se odečtou o díry a oříznou na délku čáry', () => {
    const f = sectionFrame({
      points: [
        { x: 0, y: 0 },
        { x: 1000, y: 0 },
      ],
      direction: 'left',
      depth: null,
    });
    const outer = [
      { x: -500, y: -10 },
      { x: 800, y: -10 },
      { x: 800, y: 10 },
      { x: -500, y: 10 },
    ];
    const hole = [
      { x: 100, y: -5 },
      { x: 200, y: -5 },
      { x: 200, y: 5 },
      { x: 100, y: 5 },
    ];
    expect(lineIntervals(f, [outer, hole])).toEqual([
      [0, 100],
      [200, 800],
    ]);
  });

  it('STAV-3d „Řez A ve 3D“: rovina řezu pro 3D okno = bod čáry a směr pohledu', () => {
    const s = { points: pts, direction: 'left', depth: null } as unknown as Section;
    expect(sectionCutPlane3d(s)).toEqual({
      origin: { x: 3000, y: -2000, z: 0 },
      normal: { x: -1, y: 0, z: 0 },
    });
  });

  it('rozhodnutí 19: písmena řezů jdou A, B, … Z, AA a přeskočí obsazená', () => {
    expect(nextSectionMark([])).toBe('A');
    expect(nextSectionMark(['A', 'C'])).toBe('B');
    expect(nextSectionMark(Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i)))).toBe('AA');
  });

  it('základ 9: migrace 30 → 31 přidá prázdné řezy a šrafu materiálu desky (nastavenou nechá)', () => {
    const out = projectV30toV31({ display: { categoryGraphics: { slab: { cutPen: 5 } } } });
    expect(out['sections']).toEqual({});
    expect(out['display']).toEqual({ categoryGraphics: { slab: { cutPen: 5, hatch: 'material' } } });
    const kept = projectV30toV31({ display: { categoryGraphics: { slab: { hatch: 'none' } } } });
    expect((kept['display'] as { categoryGraphics: unknown }).categoryGraphics).toEqual({
      slab: { hatch: 'none' },
    });
  });

  it('rozhodnutí 19: pohled se jmenuje podle světové strany fasády i s natočením k severu', () => {
    const f = fixture();
    expect(compassSide(f.model, { x: 0, y: -1 })).toBe('jižní');
    expect(compassSide(f.model, { x: 1, y: 0 })).toBe('východní');
    const turned = {
      ...f.model,
      project: { ...f.model.project, georef: { ...f.model.project.georef, rotationDeg: 90 } },
    };
    expect(compassSide(turned, { x: 0, y: -1 })).toBe('západní');
  });
});

describe('rozhodnutí 19: příkazy řezů', () => {
  it('základ 6: section.create s výchozími hodnotami, další řez má písmeno B, Zpět řez odebere', () => {
    const f = fixture();
    const [a] = f.run('section.create', line);
    const [b] = f.run('section.create', { ...line, direction: 'right' });
    const sa = f.model.sections[a as string];
    expect(sa).toMatchObject({
      kind: 'section',
      name: 'Řez A',
      mark: 'A',
      depth: null,
      farClip: null,
      presetId: null,
      annotationLayerId: 'ann-sections',
      scale: 100,
      range: null,
    });
    expect(f.model.sections[b as string]?.name).toBe('Řez B');
    f.editor.undo();
    expect(Object.keys(f.model.sections)).toEqual([a]);
  });

  it('základ 6: section.update / rename / delete; krátká čára a obrácený rozsah se odmítnou', () => {
    const f = fixture();
    const [id] = f.run('section.create', line);
    f.run('section.update', { sectionId: id, depth: 3000, range: { bottom: -500, top: 4000 }, scale: 50 });
    f.run('section.rename', { sectionId: id, name: 'Řez schodištěm' });
    expect(f.model.sections[id as string]).toMatchObject({ depth: 3000, scale: 50, name: 'Řez schodištěm' });
    const bad = f.editor.execute('section.update', { sectionId: id, end: { x: 3000, y: -1950 } });
    expect(bad.ok).toBe(false);
    const flip = f.editor.execute('section.update', { sectionId: id, range: { bottom: 10, top: 0 } });
    expect(flip.ok).toBe(false);
    f.run('section.delete', { sectionId: id });
    expect(f.model.sections).toEqual({});
  });

  it('rozhodnutí 19: elevation.create udělá 4 pohledy kolem obálky, každý se dívá k budově', () => {
    const f = fixture();
    f.line({ x: 0, y: 0 }, { x: 6000, y: 0 });
    f.line({ x: 6000, y: 0 }, { x: 6000, y: 4000 });
    const ids = f.run('elevation.create', {});
    const els = ids.map((id) => f.model.sections[id] as Section);
    expect(els.map((s) => s.name)).toEqual([
      'Pohled jižní',
      'Pohled východní',
      'Pohled severní',
      'Pohled západní',
    ]);
    expect(els.every((s) => s.kind === 'elevation' && s.depth === null)).toBe(true);
    const south = sectionFrame(els[0] as Section);
    expect(south.look).toEqual({ x: -0, y: 1 });
    expect((els[0] as Section).points[0]?.y).toBeLessThanOrEqual(-3000);
  });

  it('rozhodnutí 19: elevation.create v prázdném modelu odmítne', () => {
    expect(fixture().editor.execute('elevation.create', {}).ok).toBe(false);
  });
});
