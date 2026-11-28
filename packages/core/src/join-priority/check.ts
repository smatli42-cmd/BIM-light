// Podezřelá místa v prioritách spojování (pro AI a okno priorit): izolace nebo povrch nad nosnou vrstvou,
// dva různé materiály stejné úrovně ve spoji stěn, materiál bez výslovně zadané úrovně.
import type { Id } from '../ids/index.ts';
import { materialUsage } from '../material/usage.ts';
import type { Model } from '../model/types.ts';
import type { WallLayer } from '../wall-type/types.ts';
import { joinRank, materialLevel } from './rank.ts';

export type PriorityIssueKind = 'finish-over-core' | 'same-level-join' | 'implicit';

export interface PriorityIssue {
  readonly kind: PriorityIssueKind;
  readonly materialIds: readonly Id[];
  readonly levelId: Id | null;
  readonly message: string;
}

interface TypeLayers {
  readonly loadBearing: boolean;
  readonly layers: readonly WallLayer[];
}

/** Skladby, které se potkávají ve spojích: typy stěn a desek (střechy se podle priorit nespojují). */
function joinedTypes(model: Model): TypeLayers[] {
  const walls = Object.values(model.wallTypes).map((t) => ({
    loadBearing: t.properties.loadBearing,
    layers: t.bands.flatMap((b) => b.layers),
  }));
  const slabs = Object.values(model.slabTypes).map((t) => ({
    loadBearing: t.loadBearing,
    layers: model.compositions[t.compositionId]?.layers ?? [],
  }));
  return [...walls, ...slabs];
}

const nameOf = (m: Model, id: Id) => m.materials[id]?.name ?? id;

/** Izolace / povrch (nikdy jádro) v úrovni nad jádrem nosné stěny nebo desky. */
function finishOverCore(model: Model): PriorityIssue[] {
  const types = joinedTypes(model);
  const ids = (ok: (t: TypeLayers, l: WallLayer) => boolean) =>
    new Set(types.flatMap((t) => t.layers.filter((l) => ok(t, l)).map((l) => l.materialId)));
  const anyCore = ids((_t, l) => l.function === 'core');
  const core = ids((t, l) => t.loadBearing && l.function === 'core');
  const other = [...ids((_t, l) => l.function !== 'core')].filter((id) => !anyCore.has(id));
  return other.flatMap((id) => {
    const beaten = [...core].filter((c) => joinRank(model, id) > joinRank(model, c));
    if (!beaten.length) return [];
    return [
      {
        kind: 'finish-over-core' as const,
        materialIds: [id, ...beaten],
        levelId: materialLevel(model, id)?.id ?? null,
        message:
          `„${nameOf(model, id)}“ (izolace / povrch) je výš než nosné ` +
          `${beaten.map((c) => `„${nameOf(model, c)}“`).join(', ')} – ve spoji je projede`,
      },
    ];
  });
}

/** Dva různé materiály stejné úrovně, které se potkají ve spoji stěn (pokos místo vedení). */
function sameLevelJoins(model: Model): PriorityIssue[] {
  const layersOf = (wallId: Id) => {
    const w = model.elements[wallId];
    return w?.category === 'wall' ? (model.wallTypes[w.typeId]?.bands.flatMap((b) => b.layers) ?? []) : [];
  };
  const seen = new Map<string, PriorityIssue>();
  for (const r of Object.values(model.relations)) {
    if (r.noJoin) continue;
    for (const a of layersOf(r.relating.wallId))
      for (const b of layersOf(r.related.wallId)) {
        const pair = [a.materialId, b.materialId].sort() as [Id, Id];
        const key = pair.join('|');
        if (pair[0] === pair[1] || seen.has(key)) continue;
        if (joinRank(model, pair[0]) !== joinRank(model, pair[1])) continue;
        const level = materialLevel(model, pair[0]);
        seen.set(key, {
          kind: 'same-level-join',
          materialIds: pair,
          levelId: level?.id ?? null,
          message:
            `„${nameOf(model, pair[0])}“ a „${nameOf(model, pair[1])}“ jsou ve stejné úrovni ` +
            `„${level?.name ?? ''}“ a potkají se ve spoji stěn (pokos); má-li jeden vést, dej ho výš`,
        });
      }
  }
  return [...seen.values()];
}

/** Použité materiály, které nemají úroveň zadanou výslovně (jen podle kategorie). */
function implicitLevels(model: Model): PriorityIssue[] {
  return Object.values(model.materials)
    .filter((m) => m.joinLevelId === null && materialUsage(model, m.id).types > 0)
    .map((m) => ({
      kind: 'implicit' as const,
      materialIds: [m.id],
      levelId: materialLevel(model, m.id)?.id ?? null,
      message: `„${m.name}“ nemá úroveň zadanou výslovně (bere ji podle kategorie ${m.category})`,
    }));
}

export function priorityIssues(model: Model): PriorityIssue[] {
  return [...finishOverCore(model), ...sameLevelJoins(model), ...implicitLevels(model)];
}
