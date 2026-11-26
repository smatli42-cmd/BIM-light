// Uložení skladeb (krok 3 editoru typů): jediné místo, které píše vrstvy skladeb a jejich kopie v pásech
// typů. Pravidla: pás bez skladby dostane novou (stejné vrstvy = stejná skladba jen při zakládání
// projektu a migraci); změna vrstev u existujícího typu změní skladbu – a tím všechny typy, které ji
// sdílejí; nový typ s jinými vrstvami (např. jiná tloušťka) dostane vlastní skladbu.
import type { Id } from '../ids/index.ts';
import type { Model } from '../model/types.ts';
import type { HeightBand, WallLayer, WallType } from '../wall-type/types.ts';
import { WALL_USE, type Composition } from './types.ts';

export const sameLayers = (a: readonly WallLayer[], b: readonly WallLayer[]): boolean =>
  a.length === b.length && a.every((l, i) => JSON.stringify(l) === JSON.stringify(b[i]));

function freeId(m: Model, wanted: Id, taken: ReadonlySet<Id>): Id {
  let id = wanted;
  for (let i = 2; m.compositions[id] || taken.has(id); i++) id = `${wanted}-${i}`;
  return id;
}

const bandName = (t: WallType, i: number) => (t.bands.length > 1 ? `${t.name} – pás ${i + 1}` : t.name);

/** Kopie vrstev ze skladeb do pásů všech typů (invariant: pás = jeho skladba). */
export function syncTypes(m: Model): Model {
  let any = false;
  const wallTypes = Object.fromEntries(
    Object.entries(m.wallTypes).map(([id, t]) => {
      let changed = false;
      const bands = t.bands.map((b) => {
        const c = b.compositionId ? m.compositions[b.compositionId] : undefined;
        if (!c || sameLayers(c.layers, b.layers)) return b;
        changed = true;
        return { ...b, layers: c.layers };
      });
      any ||= changed;
      return [id, changed ? { ...t, bands } : t];
    }),
  );
  return any ? { ...m, wallTypes } : m;
}

/** Skladba pásu `band` (index `i`) typu `t`, který se ukládá: použít, změnit, nebo založit novou. */
function bandComposition(
  m: Model,
  t: WallType,
  band: HeightBand,
  i: number,
  add: (c: Composition) => void,
): Id {
  const c = band.compositionId ? m.compositions[band.compositionId] : undefined;
  if (c && sameLayers(c.layers, band.layers)) return c.id;
  const before = m.wallTypes[t.id]?.bands[i];
  if (c && before?.compositionId === c.id) {
    add({ ...c, layers: band.layers });
    return c.id;
  }
  const id = freeId(m, `${t.id}-skladba-${i + 1}`, new Set());
  add({ id, name: bandName(t, i), layers: band.layers, use: c?.use ?? WALL_USE });
  return id;
}

/** Uloží typ i jeho skladby a srovná kopie vrstev ve všech typech, které skladby sdílejí. */
export function storeTypeCompositions(m: Model, t: WallType): { model: Model; type: WallType } {
  const changed: Composition[] = [];
  const bands = t.bands.map((b, i) => ({
    ...b,
    compositionId: bandComposition(m, t, b, i, (c) => changed.push(c)),
  }));
  const compositions = { ...m.compositions, ...Object.fromEntries(changed.map((c) => [c.id, c])) };
  return { model: { ...m, compositions }, type: { ...t, bands } };
}

/**
 * Zakládání projektu a migrace: pásy bez platné skladby dostanou skladbu; stejné vrstvy = jedna společná
 * skladba (název podle prvního typu).
 */
export function ensureCompositions(m: Model): Model {
  const compositions: Record<Id, Composition> = { ...(m.compositions ?? {}) };
  const taken = new Set<Id>(Object.keys(compositions));
  const wallTypes = Object.fromEntries(
    Object.entries(m.wallTypes).map(([id, t]) => {
      const bands = t.bands.map((b, i) => {
        if (b.compositionId && compositions[b.compositionId]) return b;
        const same = Object.values(compositions).find((c) => sameLayers(c.layers, b.layers));
        if (same) return { ...b, compositionId: same.id };
        const cid = freeId({ ...m, compositions }, `${t.id}-skladba-${i + 1}`, taken);
        taken.add(cid);
        compositions[cid] = { id: cid, name: bandName(t, i), layers: b.layers, use: WALL_USE };
        return { ...b, compositionId: cid };
      });
      return [id, { ...t, bands }];
    }),
  );
  return syncTypes({ ...m, compositions, wallTypes });
}

/** Typy (a pásy), které skladbu používají. */
export const compositionUsers = (m: Model, compositionId: Id): WallType[] =>
  Object.values(m.wallTypes).filter((t) => t.bands.some((b) => b.compositionId === compositionId));
