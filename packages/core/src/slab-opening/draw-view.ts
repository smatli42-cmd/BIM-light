// Otvory v deskách v kresbě pohledu (D3): podlaží pohledu, hlavní model, viditelná vrstva otvorů
// a funkce grafiky. Kreslí se nad deskami.
import type { Primitive } from '../drawing/primitives.ts';
import type { Model } from '../model/types.ts';
import { resolveGraphics } from '../style/graphics.ts';
import { categoryState } from '../view/effective.ts';
import type { View } from '../view/types.ts';
import { drawSlabOpening, slabOpeningFacts } from './draw.ts';
import { allSlabOpenings } from './geometry.ts';

export function drawSlabOpenings(model: Model, view: View): Primitive[] {
  if (!categoryState(model.display, view, 'opening').visible) return [];
  return allSlabOpenings(model)
    .filter((o) => o.storeyId === view.storeyId && o.variant.kind === 'main')
    .flatMap((o) =>
      drawSlabOpening(
        model,
        o,
        view.cutPlane,
        resolveGraphics(model.display, view, slabOpeningFacts(o)).effect,
      ),
    );
}
