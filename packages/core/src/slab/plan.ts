// Půdorys desky jako plocha: obrys minus ostrovy a otvory v desce, které ji prořízne (řez, 3D, napojení).
import { difference, planePolygon, type PlanePolygon } from '../covering/polygon.ts';
import type { Model } from '../model/types.ts';
import type { Slab } from './types.ts';

export function slabPlan(model: Model, slab: Slab): PlanePolygon[] {
  const cuts = Object.values(model.slabOpenings)
    .filter((o) => o.hostIds.includes(slab.id))
    .map((o) => o.outline);
  return difference(planePolygon(slab.outline), [...(slab.holes ?? []), ...cuts]);
}
