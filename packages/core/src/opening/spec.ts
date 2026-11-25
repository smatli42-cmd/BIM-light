// Popis otvoru bez id a hostitele (kopie stěn, schránka): otvory jdou se svou stěnou (plán stěn Z4).
import type { Id, IdGenerator } from '../ids/index.ts';
import type { Model, VariantRef } from '../model/types.ts';
import type { Opening } from './types.ts';

export type OpeningSpec = Omit<Opening, 'id' | 'ifcClass' | 'category' | 'hostId' | 'storeyId' | 'variant'>;

export function openingSpecOf(o: Opening): OpeningSpec {
  const { id: _id, ifcClass: _c, category: _k, hostId: _h, storeyId: _s, variant: _v, ...spec } = o;
  return spec;
}

/** Specifikace otvorů jedné stěny. */
export const openingSpecsOf = (model: Model, wallId: Id): OpeningSpec[] =>
  Object.values(model.openings)
    .filter((o) => o.hostId === wallId)
    .map(openingSpecOf);

/** Nový otvor ze specifikace v hostiteli. */
export function openingFromSpec(
  spec: OpeningSpec,
  host: { id: Id; storeyId: Id },
  newId: IdGenerator,
  variant: VariantRef,
): Opening {
  return {
    ...spec,
    id: newId(),
    ifcClass: 'IfcOpeningElement',
    category: 'opening',
    hostId: host.id,
    storeyId: host.storeyId,
    variant,
  };
}
