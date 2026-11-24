import { describe, expect, it } from 'vitest';
import { parseProject, serializeProject } from '../persistence/project-file.ts';
import { fixture } from '../testing/fixture.ts';
import { topProfileError } from './top-profile.ts';

describe('plan-steny / Z3, rozhodnutí B: horní profil stěny (jen data)', () => {
  it('plan-steny / Z3: nová stěna má horní profil rovný', () => {
    const f = fixture();
    const id = f.line({ x: 0, y: 0 }, { x: 5000, y: 0 });
    expect(f.wall(id).topProfile).toEqual({ kind: 'flat' });
  });

  it('plan-steny / Z3: polygon se uloží příkazem a přežije uložení a načtení', () => {
    const f = fixture();
    const id = f.line({ x: 0, y: 0 }, { x: 5000, y: 0 });
    const gable = {
      kind: 'polygon',
      points: [
        { x: 0, z: 2500 },
        { x: 2500, z: 4500 },
        { x: 5000, z: 2500 },
      ],
    };
    f.run('wall.setTopProfile', { wallIds: [id], topProfile: gable });
    const r = parseProject(serializeProject(f.model));
    expect(r.ok && r.model.elements[id]).toMatchObject({ topProfile: gable });
  });

  it('plan-steny / Z3: validace polygonu (aspoň 2 body, x roste od 0, z > 0)', () => {
    const p = (points: { x: number; z: number }[]) => topProfileError({ kind: 'polygon', points });
    expect(topProfileError({ kind: 'flat' })).toBeNull();
    expect(p([{ x: 0, z: 1 }])).toMatch(/2 body/);
    expect(
      p([
        { x: -1, z: 1 },
        { x: 5, z: 1 },
      ]),
    ).toMatch(/x ≥ 0/);
    expect(
      p([
        { x: 5, z: 1 },
        { x: 5, z: 2 },
      ]),
    ).toMatch(/x roste/);
    expect(
      p([
        { x: 0, z: 1 },
        { x: 5, z: 0 },
      ]),
    ).toMatch(/z > 0/);
    const f = fixture();
    const id = f.line({ x: 0, y: 0 }, { x: 5000, y: 0 });
    const bad = {
      kind: 'polygon',
      points: [
        { x: 0, z: 1 },
        { x: 0, z: 2 },
      ],
    };
    expect(f.editor.execute('wall.setTopProfile', { wallIds: [id], topProfile: bad }).ok).toBe(false);
  });
});
