// AI scénář: priority spojování (pokyn uživatele 2026-11-28) – AI přečte tabulku úrovní a podezřelá místa,
// opraví chybné pořadí jedním příkazem material.setPriorities a ověří, že se roh stěn změnil.
import { describe, expect, it } from 'vitest';
import { must, start } from './scenario-helpers.ts';

interface Level {
  id: string;
  name: string;
  rank: number;
  materials: { id: string; name: string; explicit: boolean; usedIn: string[] }[];
}
interface Priorities {
  levels: Level[];
  policy: string;
  issues: { kind: string; materialIds: string[]; message: string }[];
}
interface WallInfo {
  layers: { material: string; area: number }[];
}
interface TypeRow {
  id: string;
  name: string;
}

describe('AI scénář: priority spojování vrstev', () => {
  it('izolace nad zdivem: dotaz ji najde, AI ji zařadí zpět pod nosné vrstvy, roh se změní', () => {
    const c = start();
    const types = c.ai.call<TypeRow[]>('wallType.list');
    const typeId = (name: string) => must(types.find((t) => t.name === name)).id;
    const wall = (a: [number, number], b: [number, number], type: string) =>
      must(
        c.ai.call<string[]>('wall.create', {
          storeyId: c.storeyId,
          typeId: typeId(type),
          path: { kind: 'line', start: { x: a[0], y: a[1] }, end: { x: b[0], y: b[1] } },
          autoConnect: true,
        })[0],
      );
    const ext = wall([0, 0], [4000, 0], 'Obvodová zateplená 465');
    const plain = wall([4000, 0], [4000, 3000], 'Zdivo 300');
    /** Plochy vrstev obou stěn v rohu (mm²): otisk tvaru napojení. */
    const corner = () =>
      [ext, plain].map((wallId) => c.ai.call<WallInfo>('wall.get', { wallId }).layers.map((l) => l.area));
    const read = () => c.ai.call<Priorities>('material.priorities');
    const good = corner();
    expect(read().policy).toMatch(/Izolace ani povrch nikdy nad nosnou/);

    // Chyba (např. po importu materiálů): Tepelná izolace se dostala nahoru.
    const ins = must(read().levels.find((l) => l.name === 'Tepelná izolace'));
    c.ai.call('material.movePriorityLevel', { levelId: ins.id, index: 0 });
    expect(corner()).not.toEqual(good);

    // AI: přečte podezřelá místa a podle zásad vrátí izolaci pod hydroizolaci – celou tabulkou najednou.
    const p = read();
    const issue = must(p.issues.find((i) => i.kind === 'finish-over-core'));
    expect(issue.message).toMatch(/Tepelná izolace EPS.*Zdivo keramické/);
    const eps = must(issue.materialIds[0]);
    const rest = p.levels.filter((l) => l.id !== ins.id);
    const at = rest.findIndex((l) => l.name === 'Hydroizolace a fólie') + 1;
    const levels = [...rest.slice(0, at), ins, ...rest.slice(at)].map(({ id, name }) => ({ id, name }));
    c.ai.call('material.setPriorities', { levels, assignments: { [eps]: ins.id } });

    const fixed = read();
    expect(fixed.issues.filter((i) => i.kind === 'finish-over-core')).toEqual([]);
    const level = must(fixed.levels.find((l) => l.id === ins.id));
    expect(must(level.materials.find((m) => m.id === eps)).explicit).toBe(true);
    expect(corner()).toEqual(good);
  });
});
