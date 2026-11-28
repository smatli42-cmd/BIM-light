// Příkazy priorit spojování (pokyn uživatele 2026-11-28): celá tabulka najednou (pro AI, jeden krok Zpět)
// a menší kroky okna Nastavení → Priority spojování (přidat, přejmenovat, posunout, smazat úroveň,
// přesunout materiál, zásady řazení). Úroveň výš projede úroveň níž (join-priority/rank.ts).
import type { Id } from '../../ids/index.ts';
import type { JoinLevel } from '../../join-priority/types.ts';
import { assignLevels, levelIndex, putPriorities } from '../../join-priority/validate.ts';
import { MATERIAL_CATEGORIES, type MaterialCategory } from '../../material/types.ts';
import type { Model } from '../../model/types.ts';
import { S, type JsonSchema } from '../schema.ts';
import { defineCommand, fail } from '../types.ts';

const levelId: JsonSchema = { type: 'string', description: 'id úrovně (material.priorities)' };
const levelOrNull: JsonSchema = {
  oneOf: [{ type: 'string' }, { type: 'null' }],
  description: 'id úrovně nebo null',
};

interface SetParams {
  levels: { id?: Id; name: string }[];
  categoryLevels?: Partial<Record<MaterialCategory, Id>>;
  assignments?: Record<Id, Id | null>;
  policy?: string;
}

export const materialSetPriorities = defineCommand<SetParams>({
  name: 'material.setPriorities',
  label: 'Priority spojování (celá tabulka)',
  description:
    'Nastaví celou tabulku priorit spojování jedním krokem Zpět: levels = úrovně shora dolů ({id?, name}; ' +
    'úroveň výš projede úroveň níž; bez id = nová úroveň), categoryLevels = výchozí úroveň kategorie ' +
    '(id, nebo název nové úrovně), assignments = {materialId: id úrovně | null = podle kategorie}, ' +
    'policy = zásady řazení. Co se nezadá, zůstane. Před změnou přečti material.priorities.',
  group: 'Materiál',
  params: S.object(
    {
      levels: {
        type: 'array',
        items: S.object({ id: S.id, name: { type: 'string' } }, ['name']),
        description: 'úrovně shora dolů',
      },
      categoryLevels: { type: 'object', description: 'kategorie → id (nebo název) úrovně' },
      assignments: {
        type: 'object',
        description: 'materialId → id (nebo název) úrovně, null = podle kategorie',
      },
      policy: { type: 'string', description: 'zásady řazení textem' },
    },
    ['levels'],
  ),
  run(model, p, ctx) {
    const levels: JoinLevel[] = p.levels.map((l) => ({ id: l.id ?? ctx.newId(), name: l.name }));
    const resolve = (ref: Id) =>
      levels.find((l) => l.id === ref || l.name.trim() === ref.trim())?.id ??
      fail('not-found', `Úroveň ${ref} v nové tabulce není`);
    const categoryLevels = { ...model.joinPriorities.categoryLevels };
    for (const [c, ref] of Object.entries(p.categoryLevels ?? {})) {
      if (!MATERIAL_CATEGORIES.includes(c as MaterialCategory)) fail('invalid', `Neznámá kategorie ${c}`);
      categoryLevels[c as MaterialCategory] = resolve(ref);
    }
    const assign = Object.fromEntries(
      Object.entries(p.assignments ?? {}).map(([id, ref]) => [id, ref === null ? null : resolve(ref)]),
    );
    const m = assignLevels(model, assign);
    const policy = p.policy ?? model.joinPriorities.policy;
    return { model: putPriorities(m, { levels, categoryLevels, policy }) };
  },
});

const withLevels = (model: Model, levels: readonly JoinLevel[]) =>
  putPriorities(model, { ...model.joinPriorities, levels });

export const materialAddPriorityLevel = defineCommand<{ name: string; index?: number }>({
  name: 'material.addPriorityLevel',
  label: 'Přidat úroveň priority',
  description: 'Přidá úroveň priority spojování s názvem na pozici index (0 = nahoře, výchozí dole).',
  group: 'Materiál',
  params: S.object({ name: { type: 'string' }, index: { type: 'integer', minimum: 0 } }, ['name']),
  run(model, p, ctx) {
    const levels = [...model.joinPriorities.levels];
    const id = ctx.newId();
    levels.splice(Math.min(p.index ?? levels.length, levels.length), 0, { id, name: p.name });
    return { model: withLevels(model, levels), created: [id] };
  },
});

export const materialRenamePriorityLevel = defineCommand<{ levelId: Id; name: string }>({
  name: 'material.renamePriorityLevel',
  label: 'Přejmenovat úroveň priority',
  description: 'Přejmenuje úroveň priority spojování (název je v tabulce jedinečný).',
  group: 'Materiál',
  params: S.object({ levelId, name: { type: 'string' } }, ['levelId', 'name']),
  run(model, p) {
    levelIndex(model, p.levelId);
    const levels = model.joinPriorities.levels.map((l) => (l.id === p.levelId ? { ...l, name: p.name } : l));
    return { model: withLevels(model, levels) };
  },
});

export const materialMovePriorityLevel = defineCommand<{ levelId: Id; index: number }>({
  name: 'material.movePriorityLevel',
  label: 'Posunout úroveň priority',
  description:
    'Přesune úroveň priority spojování na pozici index (0 = nahoře = projede všechny ostatní). ' +
    'Spoje stěn a uložení stropů se hned přepočítají.',
  group: 'Materiál',
  params: S.object({ levelId, index: { type: 'integer', minimum: 0 } }, ['levelId', 'index']),
  run(model, p) {
    const from = levelIndex(model, p.levelId);
    const levels = [...model.joinPriorities.levels];
    const [lv] = levels.splice(from, 1);
    if (lv) levels.splice(Math.min(p.index, levels.length), 0, lv);
    return { model: withLevels(model, levels) };
  },
});

export const materialDeletePriorityLevel = defineCommand<{ levelId: Id; moveTo?: Id }>({
  name: 'material.deletePriorityLevel',
  label: 'Smazat úroveň priority',
  description:
    'Smaže úroveň priority spojování. Je-li v ní nějaký materiál nebo kategorie, je nutné moveTo ' +
    '(úroveň, kam se přesunou); bez něj se smazání odmítne.',
  group: 'Materiál',
  params: S.object({ levelId, moveTo: levelId }, ['levelId']),
  run(model, p) {
    levelIndex(model, p.levelId);
    if (p.moveTo !== undefined) levelIndex(model, p.moveTo);
    const jp = model.joinPriorities;
    const mats = Object.values(model.materials).filter((m) => m.joinLevelId === p.levelId);
    const cats = MATERIAL_CATEGORIES.filter((c) => jp.categoryLevels[c] === p.levelId);
    if ((mats.length || cats.length) && (!p.moveTo || p.moveTo === p.levelId))
      fail(
        'invalid',
        `V úrovni je ${mats.length} materiálů a ${cats.length} kategorií; zvol, kam je přesunout`,
      );
    const to = p.moveTo ?? '';
    const m = assignLevels(model, Object.fromEntries(mats.map((x) => [x.id, to])));
    const categoryLevels = { ...jp.categoryLevels };
    for (const c of cats) categoryLevels[c] = to;
    const levels = jp.levels.filter((l) => l.id !== p.levelId);
    return { model: putPriorities(m, { ...jp, levels, categoryLevels }) };
  },
});

export const materialSetJoinLevel = defineCommand<{ materialIds: Id[]; levelId: Id | null }>({
  name: 'material.setJoinLevel',
  label: 'Úroveň priority materiálu',
  description:
    'Přesune materiály do úrovně priority spojování (levelId), nebo je vrátí do úrovně podle kategorie ' +
    '(levelId null).',
  group: 'Materiál',
  params: S.object({ materialIds: { type: 'array', items: S.id }, levelId: levelOrNull }, [
    'materialIds',
    'levelId',
  ]),
  run(model, p) {
    if (p.levelId !== null) levelIndex(model, p.levelId);
    const m = assignLevels(model, Object.fromEntries(p.materialIds.map((id) => [id, p.levelId])));
    return { model: putPriorities(m, m.joinPriorities) };
  },
});

export const materialSetJoinPolicy = defineCommand<{ policy: string }>({
  name: 'material.setJoinPolicy',
  label: 'Zásady řazení priorit',
  description: 'Nastaví zásady řazení priorit spojování (text, podle něj AI zařadí nový materiál).',
  group: 'Materiál',
  params: S.object({ policy: { type: 'string' } }, ['policy']),
  run(model, p) {
    return { model: { ...model, joinPriorities: { ...model.joinPriorities, policy: p.policy } } };
  },
});

export const PRIORITY_COMMANDS = [
  materialSetPriorities,
  materialAddPriorityLevel,
  materialRenamePriorityLevel,
  materialMovePriorityLevel,
  materialDeletePriorityLevel,
  materialSetJoinLevel,
  materialSetJoinPolicy,
] as const;
