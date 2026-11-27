// Desky v kresbě pohledu (D1): desky podlaží pohledu, hlavní model, viditelná vrstva „Desky“
// a funkce grafiky (filtr rekonstrukce, pravidla). Kreslí se pod stěnami.
import type { Primitive } from '../drawing/primitives.ts';
import type { Model } from '../model/types.ts';
import { elementFacts } from '../style/conditions.ts';
import { resolveGraphics } from '../style/graphics.ts';
import { categoryState } from '../view/effective.ts';
import type { View } from '../view/types.ts';
import { drawSlab } from './draw.ts';
import { allSlabs } from './queries.ts';

export function drawSlabs(model: Model, view: View): Primitive[] {
  if (!categoryState(model.display, view, 'slab').visible) return [];
  return allSlabs(model)
    .filter((s) => s.storeyId === view.storeyId && s.variant.kind === 'main')
    .flatMap((s) =>
      drawSlab(model, s, view.cutPlane, resolveGraphics(model.display, view, elementFacts(model, s)).effect),
    );
}
