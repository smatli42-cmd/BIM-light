// Dotazy pro AI: knihovna šraf a materiály projektu (s počtem použití).
import { S } from '../commands/schema.ts';
import { HATCH_LIBRARY } from '../hatch/registry.ts';
import { materialFill, materialLines } from '../material/colors.ts';
import { materialUsage } from '../material/usage.ts';
import { joinRank, materialLevel } from '../join-priority/rank.ts';
import { defineQuery } from './types.ts';

export const hatchList = defineQuery<Record<string, never>, unknown>({
  name: 'hatch.list',
  label: 'Knihovna šraf',
  description:
    'Vrátí knihovnu šraf v pořadí: id (např. hatch.zdivo), název, skupina, varianta které šrafy, ' +
    'plná (vyčerněná) a zda je kopie už v projektu. Šrafa nese jen tvar, barva je u materiálu.',
  group: 'Materiál',
  params: S.object({}, []),
  run(m) {
    return HATCH_LIBRARY.map((h) => ({
      id: h.id,
      name: h.name,
      group: h.group,
      variantOf: h.variantOf ?? null,
      solid: !!h.solid,
      inProject: !!m.display.hatches[h.id],
    }));
  },
});

export const materialList = defineQuery<Record<string, never>, unknown>({
  name: 'material.list',
  label: 'Materiály',
  description:
    'Vrátí materiály projektu: id, název, kategorie, barva, šrafa (id), pero šrafy, výsledné 2D barvy ' +
    'čar a výplně (odvozené nebo přepsané), průhlednost ve 3D, úroveň priority spojování (joinLevelId, výslovně / podle kategorie, joinRank = pořadí zdola), poznámka a použití ' +
    '(počet prvků a skladeb).',
  group: 'Materiál',
  params: S.object({}, []),
  run(m) {
    return Object.values(m.materials).map((x) => ({
      id: x.id,
      name: x.name,
      category: x.category,
      color: x.color,
      hatchId: x.hatchId,
      hatchPen: x.hatchPen,
      lines2D: materialLines(x),
      fill2D: materialFill(x),
      transparent3D: x.transparent3D,
      joinLevelId: materialLevel(m, x.id)?.id ?? null,
      joinLevelExplicit: x.joinLevelId !== null,
      joinRank: joinRank(m, x.id),
      note: x.note,
      usage: materialUsage(m, x.id),
    }));
  },
});
