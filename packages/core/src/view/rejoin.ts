// Napojení v kresbě po skrytí stěn (hlášení uživatele 2026-11-26): konec stěny, který byl napojený jen na
// stěnu skrytou v pohledu (např. vybouraný úsek v plánovaném stavu), se v kresbě napojí na volný konec
// jiné zobrazené stěny ve stejném bodě (nová stěna místo bourané). Jako v Archicadu se napojení počítá
// mezi zobrazenými prvky. Model se nemění – doplní se jen do kopie pro kresbu; ručně odpojené konce
// („nespojovat“ je uložený vztah) se nedotknou.
import { endPoint, type PathEnd } from '../geometry/index.ts';
import type { Id } from '../ids/index.ts';
import { sameNode } from '../junction/frame.ts';
import type { Model } from '../model/types.ts';
import { putRelations } from '../model/update.ts';
import type { WallConnection } from '../relation/types.ts';
import { connectionsOf, endToType, sidesFor, typeToEnd } from '../wall/queries.ts';

interface End {
  readonly wallId: Id;
  readonly end: PathEnd;
}

const ENDS: readonly PathEnd[] = ['start', 'end'];
const isFree = (m: Model, e: End) =>
  !connectionsOf(m, e.wallId).some((c) => sidesFor(c, e.wallId).own.at === endToType(e.end));
const pointOf = (m: Model, e: End) => {
  const w = m.elements[e.wallId];
  return w ? endPoint(w.path, e.end) : { x: Number.NaN, y: Number.NaN };
};

/** Konce zobrazených stěn, které ztratily napojení, protože druhá stěna je skrytá. */
function orphans(full: Model, removed: readonly WallConnection[], hidden: ReadonlySet<Id>): End[] {
  return removed.flatMap((r) =>
    [r.relating, r.related].flatMap((side) => {
      const end = typeToEnd(side.at);
      return end && !hidden.has(side.wallId) && full.elements[side.wallId]
        ? [{ wallId: side.wallId, end }]
        : [];
    }),
  );
}

/** Doplní do kopie `copy` napojení osiřelých konců na volné konce ve stejném bodě. */
export function rejoinOrphans(
  full: Model,
  copy: Model,
  removed: readonly WallConnection[],
  hidden: ReadonlySet<Id>,
): Model {
  const lost = orphans(full, removed, hidden).filter((e) => isFree(copy, e));
  if (!lost.length) return copy;
  const free = Object.keys(copy.elements).flatMap((wallId) =>
    ENDS.map((end) => ({ wallId, end })).filter((e) => isFree(copy, e)),
  );
  const used = new Set<string>();
  const key = (e: End) => `${e.wallId}:${e.end}`;
  const added: WallConnection[] = [];
  for (const o of lost) {
    if (used.has(key(o))) continue;
    const p = pointOf(copy, o);
    const storey = copy.elements[o.wallId]?.storeyId;
    const mate = free.find(
      (e) =>
        e.wallId !== o.wallId &&
        !used.has(key(e)) &&
        copy.elements[e.wallId]?.storeyId === storey &&
        sameNode(pointOf(copy, e), p),
    );
    if (!mate) continue;
    used.add(key(o)).add(key(mate));
    added.push({
      id: `kresba:${key(o)}|${key(mate)}`,
      kind: 'wall-connection',
      relating: { wallId: o.wallId, at: endToType(o.end) },
      related: { wallId: mate.wallId, at: endToType(mate.end) },
    });
  }
  return added.length ? putRelations(copy, added) : copy;
}
