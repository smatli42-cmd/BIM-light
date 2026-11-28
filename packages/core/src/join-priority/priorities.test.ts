import { describe, expect, it } from 'vitest';
import { vec } from '../geometry/index.ts';
import type { Model } from '../model/types.ts';
import { fixture, type Fixture } from '../testing/fixture.ts';
import { allWallGeometry } from '../wall/geometry.ts';
import { projectV43toV44 } from './migrate-v43.ts';
import { joinRank, materialLevel } from './rank.ts';
import { DEFAULT_JOIN_LEVELS } from './types.ts';

const matId = (f: Fixture, name: string) => Object.values(f.model.materials).find((m) => m.name === name)!.id;
const level = (f: Fixture, name: string) => f.model.joinPriorities.levels.find((l) => l.name === name)!.id;
const index = (f: Fixture, name: string) => f.model.joinPriorities.levels.findIndex((l) => l.name === name);

/** Obvodové zateplené stěny 6 × 4 m, k nim roh L nezateplené zdi (přístavek) a příčka do T. */
function house(f: Fixture) {
  f.run('wall.rectangle', {
    storeyId: f.storeyId,
    typeId: f.type('Obvodová zateplená 465'),
    a: vec(0, 0),
    b: vec(6000, 4000),
  });
  f.line(vec(6000, 0), vec(9000, 0), { typeId: f.type('Obvodová zateplená 465'), autoConnect: true });
  f.line(vec(9000, 0), vec(9000, 3000), { typeId: f.type('Zdivo 300'), autoConnect: true });
  f.line(vec(3000, 0), vec(3000, 4000), { typeId: f.type('Příčka 100'), autoConnect: true });
  return f;
}

/** Plochy vrstev všech stěn (otisk výsledku spojů). */
const shapes = (m: Model) =>
  [...allWallGeometry(m).values()].map((g) =>
    g.layers.map((l) =>
      l.polygons.map((p) => p.map((q) => `${Math.round(q.x)},${Math.round(q.y)}`).join(' ')),
    ),
  );

/** Projekt ve tvaru verze 43: materiál nese číslo joinPriority místo úrovně. */
function asV43(m: Model, numbers: Record<string, number>): Record<string, unknown> {
  const legacy = Object.fromEntries(DEFAULT_JOIN_LEVELS.map((l) => [l.id, l.legacy]));
  const materials = Object.fromEntries(
    Object.values(m.materials).map((x) => {
      const { joinLevelId: _l, ...rest } = x;
      const own = numbers[x.name] ?? legacy[materialLevel(m, x.id)!.id]!;
      return [x.id, { ...rest, joinPriority: own }];
    }),
  );
  const { joinPriorities: _j, ...data } = m;
  return { ...data, materials, schemaVersion: 43 };
}

describe('priority spojování (pokyn uživatele 2026-11-28): tabulka úrovní', () => {
  it('priority 1: úroveň výš projede úroveň níž – joinRank je pořadí úrovně zdola', () => {
    const f = fixture();
    const n = f.model.joinPriorities.levels.length;
    expect(joinRank(f.model, matId(f, 'Ocel'))).toBe(n);
    expect(joinRank(f.model, matId(f, 'Železobeton'))).toBe(n - 1);
    expect(joinRank(f.model, matId(f, 'Zdivo keramické'))).toBeGreaterThan(
      joinRank(f.model, matId(f, 'Tepelná izolace EPS')),
    );
    expect(joinRank(f.model, 'neexistuje')).toBe(0);
  });

  it('priority 2: materiál bez výjimky bere úroveň kategorie, výjimka se uloží u materiálu', () => {
    const f = fixture();
    expect(materialLevel(f.model, matId(f, 'Beton prostý'))?.id).toBe('join-concrete');
    expect(f.model.materials[matId(f, 'Železobeton')]?.joinLevelId).toBe('join-rc');
    f.run('material.setJoinLevel', { materialIds: [matId(f, 'Beton prostý')], levelId: 'join-rc' });
    expect(joinRank(f.model, matId(f, 'Beton prostý'))).toBe(joinRank(f.model, matId(f, 'Železobeton')));
  });

  it('priority 2: migrace 43 → 44 zachová pořadí i shody čísel a výsledek spojů se nezmění', () => {
    const f = house(fixture());
    const before = shapes(f.model);
    const data = asV43(f.model, { Omítka: 10, Ocel: 999, Sklo: 33, Štěrk: 33 });
    const old = data['materials'] as Record<string, { name: string; joinPriority: number }>;
    const m = projectV43toV44(data) as unknown as Model;
    expect(shapes(m)).toEqual(before);
    for (const a of Object.values(old))
      for (const b of Object.values(old))
        expect(Math.sign(joinRank(m, idOf(m, a.name)) - joinRank(m, idOf(m, b.name)))).toBe(
          Math.sign(a.joinPriority - b.joinPriority),
        );
    expect(m.joinPriorities.levels.map((l) => l.name)).toContain('Priorita 999');
    expect(m.joinPriorities.levels[0]?.name).toBe('Priorita 999');
    expect(m.materials[idOf(m, 'Zdivo keramické')]?.joinLevelId).toBeNull();
    expect(m.materials[idOf(m, 'Sklo')]?.joinLevelId).toBe('join-p33');
  });

  it('priority 1: posun Tepelné izolace nad Zdivo změní roh zateplené a nezateplené zdi, Zpět ho vrátí', () => {
    const f = house(fixture());
    const before = shapes(f.model);
    f.run('material.movePriorityLevel', { levelId: level(f, 'Tepelná izolace'), index: index(f, 'Zdivo') });
    expect(index(f, 'Tepelná izolace')).toBeLessThan(index(f, 'Zdivo'));
    expect(shapes(f.model)).not.toEqual(before);
    f.editor.undo();
    expect(shapes(f.model)).toEqual(before);
  });

  it('priority 4: material.setPriorities nastaví tabulku i přiřazení jedním krokem Zpět', () => {
    const f = fixture();
    const before = f.model.joinPriorities;
    const levels = [
      { name: 'Nosné' },
      ...before.levels.filter((l) => l.id !== 'join-rc').map((l) => ({ id: l.id, name: l.name })),
    ];
    f.run('material.setPriorities', {
      levels,
      assignments: { [matId(f, 'Železobeton')]: 'Nosné', [matId(f, 'Anhydrit')]: null },
      categoryLevels: { Kov: 'Nosné' },
      policy: 'Nosné nahoře.',
    });
    expect(f.model.joinPriorities.levels[0]?.name).toBe('Nosné');
    expect(materialLevel(f.model, matId(f, 'Ocel'))?.name).toBe('Nosné');
    expect(materialLevel(f.model, matId(f, 'Anhydrit'))?.id).toBe('join-concrete');
    expect(f.model.joinPriorities.policy).toBe('Nosné nahoře.');
    f.editor.undo();
    expect(f.model.joinPriorities).toEqual(before);
  });

  it('priority 3: smazat jde jen prázdnou úroveň, nebo s přesunem materiálů a kategorií', () => {
    const f = fixture();
    const masonry = level(f, 'Zdivo');
    expect(f.editor.execute('material.deletePriorityLevel', { levelId: masonry }).ok).toBe(false);
    f.run('material.deletePriorityLevel', { levelId: masonry, moveTo: 'join-wood' });
    expect(materialLevel(f.model, matId(f, 'Zdivo keramické'))?.id).toBe('join-wood');
    const [id] = f.run('material.addPriorityLevel', { name: 'Prázdná', index: 0 });
    f.run('material.renamePriorityLevel', { levelId: id, name: 'Kotvy' });
    expect(f.model.joinPriorities.levels[0]?.name).toBe('Kotvy');
    expect(
      f.editor.execute('material.renamePriorityLevel', { levelId: id, name: 'Dřevo a dřevěné konstrukce' })
        .ok,
    ).toBe(false);
    f.run('material.deletePriorityLevel', { levelId: id });
    expect(f.model.joinPriorities.levels.some((l) => l.id === id)).toBe(false);
  });

  it('priority 4: material.priorities hlásí izolaci nad nosnou vrstvou a dva materiály stejné úrovně ve spoji', () => {
    const f = house(fixture());
    type Out = { issues: { kind: string; materialIds: string[] }[] };
    const issues = () => (f.editor.query('material.priorities', {}) as { data: Out }).data.issues;
    expect(
      issues()
        .filter((i) => i.kind !== 'implicit')
        .map((i) => (i as { message?: string }).message),
    ).toEqual([]);
    expect(issues().some((i) => i.kind === 'implicit')).toBe(true);
    f.run('material.movePriorityLevel', { levelId: level(f, 'Tepelná izolace'), index: 0 });
    const bad = issues().find((i) => i.kind === 'finish-over-core');
    expect(bad?.materialIds[0]).toBe(matId(f, 'Tepelná izolace EPS'));
    f.run('material.setJoinLevel', { materialIds: [matId(f, 'Omítka')], levelId: level(f, 'Zdivo') });
    expect(issues().some((i) => i.kind === 'same-level-join')).toBe(true);
  });
});

function idOf(m: Model, name: string) {
  return Object.values(m.materials).find((x) => x.name === name)!.id;
}
