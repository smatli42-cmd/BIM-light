// Dotaz pro AI: tabulka priorit spojování (úrovně shora dolů, materiály v nich, kde se používají)
// a podezřelá místa. Podle `policy` AI zařadí nový materiál; změní ji příkazy material.*Priorit*.
import { S } from '../commands/schema.ts';
import type { Id } from '../ids/index.ts';
import { priorityIssues } from '../join-priority/check.ts';
import { materialLevelId } from '../join-priority/rank.ts';
import { materialUsage } from '../material/usage.ts';
import type { Model } from '../model/types.ts';
import { defineQuery } from './types.ts';

/** Názvy skladeb (typů stěn a skladeb desek / střech), které materiál používají. */
function usedIn(m: Model, id: Id): string[] {
  const walls = Object.values(m.wallTypes)
    .filter((t) => t.bands.some((b) => b.layers.some((l) => l.materialId === id)))
    .map((t) => t.name);
  const comps = Object.values(m.compositions)
    .filter((c) => c.layers.some((l) => l.materialId === id))
    .map((c) => c.name);
  return [...new Set([...walls, ...comps])];
}

export const materialPriorities = defineQuery<Record<string, never>, unknown>({
  name: 'material.priorities',
  label: 'Priority spojování',
  description:
    'Vrátí tabulku priorit spojování vrstev: levels shora dolů (úroveň výš projede úroveň níž ve spojích ' +
    'stěn a při uložení stropu; rank = pořadí zdola), u každé materiály (id, název, kategorie, explicit = ' +
    'úroveň zadaná výslovně / jen podle kategorie, usedIn = skladby, elements = počet prvků), ' +
    'categoryLevels (výchozí úroveň kategorie), policy (zásady řazení) a issues (podezřelá místa: ' +
    'finish-over-core = izolace / povrch nad nosnou vrstvou, same-level-join = dva materiály stejné úrovně ' +
    've spoji, implicit = úroveň jen podle kategorie). Mění se příkazy material.setPriorities (vše najednou), ' +
    'material.movePriorityLevel, material.setJoinLevel aj.',
  group: 'Materiál',
  params: S.object({}, []),
  run(m) {
    const jp = m.joinPriorities;
    const mats = Object.values(m.materials);
    return {
      levels: jp.levels.map((l, i) => ({
        id: l.id,
        name: l.name,
        rank: jp.levels.length - i,
        materials: mats
          .filter((x) => materialLevelId(m, x) === l.id)
          .map((x) => ({
            id: x.id,
            name: x.name,
            category: x.category,
            explicit: x.joinLevelId !== null,
            usedIn: usedIn(m, x.id),
            elements: materialUsage(m, x.id).elements,
          })),
      })),
      categoryLevels: jp.categoryLevels,
      policy: jp.policy,
      issues: priorityIssues(m),
    };
  },
});
