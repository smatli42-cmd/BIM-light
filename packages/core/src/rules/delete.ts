// Mazání podle průřezových pravidel (základ 7): co se smaže s prvkem, říká tabulka.
import { dimensionOpeningIds, dimensionWallIds } from '../dimension/measure.ts';
import type { Id } from '../ids/index.ts';
import type { Model } from '../model/types.ts';
import {
  putSlabOpenings,
  removeDimensions,
  removeElements,
  removeOpenings,
  removeRelations,
  removeSlabOpenings,
} from '../model/update.ts';
import { rulesFor } from './cross-rules.ts';
import { detachWallsFrom } from '../wall-height/attach.ts';
import { pruneOutlineDimensions } from '../dimension/outline-ref.ts';

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

/** Otvory v deskách: smazaná deska zmizí z hostitelů; otvor bez hostitele zanikne. */
function unhostSlabOpenings(model: Model, gone: ReadonlySet<Id>): Model {
  const hit = Object.values(model.slabOpenings).filter((o) => o.hostIds.some((h) => gone.has(h)));
  const kept = hit.map((o) => ({ ...o, hostIds: o.hostIds.filter((h) => !gone.has(h)) }));
  const m = putSlabOpenings(
    model,
    kept.filter((o) => o.hostIds.length),
  );
  return removeSlabOpenings(
    m,
    kept.filter((o) => !o.hostIds.length).map((o) => o.id),
  );
}

/** Smaže prvky a vše, co s nimi podle tabulky zaniká. */
export function deleteElements(input: Model, ids: readonly Id[]): Model {
  const gone = new Set(ids);
  // Výškové kóty k hranám smazaných prvků zaniknou (jako kóty k jejich lícům).
  const levelDims = Object.fromEntries(
    Object.entries(input.levelDims ?? {}).filter(
      ([, d]) => d.ref.kind !== 'edge' || !gone.has(d.ref.elementId),
    ),
  );
  const planLevelDims = Object.fromEntries(
    Object.entries(input.planLevelDims ?? {}).filter(
      ([, d]) => d.ref.kind !== 'edge' || !gone.has(d.ref.elementId),
    ),
  );
  const model = { ...input, levelDims, planLevelDims };
  const cascade = new Set(
    ids.flatMap((id) => {
      const el = model.elements[id];
      return el ? rulesFor(el.category).onDelete : [];
    }),
  );
  // Stěny připojené vrškem k mazané desce se odpojí se stejnou výškou (desky D4, Revit).
  let m = removeElements(detachWallsFrom(model, gone), gone);
  if (cascade.has('openings')) {
    const ops = Object.values(m.openings).filter((o) => gone.has(o.hostId));
    m = deleteOpenings(
      m,
      ops.map((o) => o.id),
    );
  }
  if (cascade.has('openings')) m = unhostSlabOpenings(m, gone);
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
  // Kóty k hranám smazaných desek a otvorů v deskách zaniknou (desky D4).
  return pruneOutlineDimensions(m);
}
