// Prvky viditelné v řezu / pohledu: hlavní model, viditelná vrstva kategorie a funkce grafiky (filtr
// rekonstrukce, pravidlo „skrýt“, přepisy). Skryté stěny se nenapojují (jako v půdorysu, visible-walls.ts)
// a otvor skrytý filtrem rekonstrukce stěnu nevyřízne (probourání ve stávajícím stavu). Model se nemění.
import type { Id } from '../ids/index.ts';
import type { Model } from '../model/types.ts';
import { removeElements, removeOpenings, removeRelations } from '../model/update.ts';
import { openingFacts } from '../opening/draw.ts';
import { allSlabs } from '../slab/queries.ts';
import type { Slab } from '../slab/types.ts';
import { allRoofs } from '../roof/queries.ts';
import type { Roof } from '../roof/types.ts';
import { elementFacts } from '../style/conditions.ts';
import { resolveGraphics } from '../style/graphics.ts';
import type { ResolvedEffect } from '../style/types.ts';
import { categoryState } from '../view/effective.ts';
import { allWalls } from '../wall/queries.ts';
import type { Wall } from '../wall/types.ts';
import type { Section } from './types.ts';

export interface SectionElements {
  /** Model bez skrytých stěn, jejich napojení a skrytých otvorů (pro geometrii). */
  readonly model: Model;
  readonly walls: readonly { readonly wall: Wall; readonly g: ResolvedEffect }[];
  readonly slabs: readonly { readonly slab: Slab; readonly g: ResolvedEffect }[];
  readonly roofs: readonly { readonly roof: Roof; readonly g: ResolvedEffect }[];
}

function shown<T extends Wall | Slab | Roof>(model: Model, s: Section, items: readonly T[]) {
  const out: { el: T; g: ResolvedEffect }[] = [];
  const hidden = new Set<Id>();
  for (const el of items) {
    if (el.variant.kind !== 'main') continue;
    const g = resolveGraphics(model.display, s, elementFacts(model, el)).effect;
    if (categoryState(model.display, s, el.category).visible && g.visible) out.push({ el, g });
    else hidden.add(el.id);
  }
  return { out, hidden };
}

export function sectionElements(model: Model, s: Section): SectionElements {
  const w = shown(model, s, allWalls(model));
  const sl = shown(model, s, allSlabs(model));
  const rf = shown(model, s, allRoofs(model));
  const gone = Object.values(model.relations).filter(
    (r) =>
      r.kind === 'wall-connection' && (w.hidden.has(r.relating.wallId) || w.hidden.has(r.related.wallId)),
  );
  let m = w.hidden.size
    ? removeRelations(
        removeElements(model, w.hidden),
        gone.map((r) => r.id),
      )
    : model;
  const hiddenOpenings = Object.values(m.openings).filter(
    (o) => !resolveGraphics(model.display, s, openingFacts(o)).effect.visible,
  );
  if (hiddenOpenings.length)
    m = removeOpenings(
      m,
      hiddenOpenings.map((o) => o.id),
    );
  return {
    model: m,
    walls: w.out.map(({ el, g }) => ({ wall: el, g })),
    slabs: sl.out.map(({ el, g }) => ({ slab: el, g })),
    roofs: rf.out.map(({ el, g }) => ({ roof: el, g })),
  };
}
