// Plocha podlahy pro výkaz (Revit: podlaha se odečte tam, kde ji prořízne stěna): ruční podlaha přes více
// místností leží i pod příčkami – výkaz plochy a objemu odečte půdorys stěn, které stojí na podlaží
// (stejné stěny, jako ohraničují místnosti). Podlaha vázaná na místnost vede od líce k líci, stěny pod
// ní nejsou. Nosná deska se neodečítá (stěny na ní stojí).
import { difference, planePolygon, polygonsArea } from '../covering/polygon.ts';
import type { Model } from '../model/types.ts';
import { boundingShapes, boundingWalls } from '../room/bounding.ts';
import { slabArea } from './geometry.ts';
import type { Slab } from './types.ts';

/** Plocha desky pro výkaz (mm²): u ruční podlahy bez půdorysu stěn, jinak plocha obrysu minus ostrovy. */
export function slabScheduleArea(model: Model, s: Slab): number {
  if (s.slabFunction !== 'floor' || s.link?.kind === 'room') return slabArea(s);
  const walls = boundingWalls(model, s.storeyId, s.status, s.variant);
  if (!walls.length) return slabArea(s);
  const base = planePolygon(s.outline).map((p) => ({ ...p, holes: [...p.holes, ...(s.holes ?? [])] }));
  return polygonsArea(difference(base, boundingShapes(model, walls).solids));
}
