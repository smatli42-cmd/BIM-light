// Mazání podle průřezových pravidel (základ 7): co se smaže s prvkem, říká tabulka.
import { dimensionOpeningIds, dimensionWallIds } from '../dimension/measure.ts';
import type { Id } from '../ids/index.ts';
import type { Model } from '../model/types.ts';
import { removeDimensions, removeElements, removeOpenings, removeRelations } from '../model/update.ts';
import { rulesFor } from './cross-rules.ts';

/** Smaže otvory a s nimi kóty k jejich hranám (stěna se zacelí, protože se počítá z modelu). */
export function deleteOpenings(model: Model, ids: readonly Id[]): Model {
  const gone = new Set(ids);
  const m = removeOpenings(model, gone);
  if (!rulesFor('opening').onDelete.includes('dimensions')) return m;
  const dims = Object.values(m.dimensions).filter((d) => dimensionOpeningIds(d).some((o) => gone.has(o)));
  return removeDimensions(
    m,
    dims.map((d) => d.id),
  );
}

/** Smaže prvky a vše, co s nimi podle tabulky zaniká. */
export function deleteElements(model: Model, ids: readonly Id[]): Model {
  const gone = new Set(ids);
  const cascade = new Set(
    ids.flatMap((id) => {
      const el = model.elements[id];
      return el ? rulesFor(el.category).onDelete : [];
    }),
  );
  let m = removeElements(model, gone);
  if (cascade.has('openings')) {
    const ops = Object.values(m.openings).filter((o) => gone.has(o.hostId));
    m = deleteOpenings(
      m,
      ops.map((o) => o.id),
    );
  }
  if (cascade.has('connections')) {
    const rels = Object.values(m.relations).filter(
      (r) => gone.has(r.relating.wallId) || gone.has(r.related.wallId),
    );
    m = removeRelations(
      m,
      rels.map((r) => r.id),
    );
  }
  if (cascade.has('dimensions')) {
    const dims = Object.values(m.dimensions).filter((d) => dimensionWallIds(d).some((w) => gone.has(w)));
    m = removeDimensions(
      m,
      dims.map((d) => d.id),
    );
  }
  if (cascade.has('tags')) {
    const wallTags = Object.fromEntries(Object.entries(m.wallTags).filter(([, t]) => !gone.has(t.wallId)));
    m = { ...m, wallTags };
  }
  return m;
}
