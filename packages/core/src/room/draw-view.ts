// Místnosti v kresbě pohledu: podlaží pohledu, hlavní model, viditelná vrstva „Místnosti“, filtr
// rekonstrukce a pravidla přes funkci grafiky; velikosti a volby razítka ze stylu pohledu.
import type { Primitive } from '../drawing/primitives.ts';
import type { Model } from '../model/types.ts';
import { resolveGraphics } from '../style/graphics.ts';
import { categoryState, styleOfView } from '../view/effective.ts';
import type { View } from '../view/types.ts';
import { drawRoom, roomFacts } from './draw.ts';
import { allRoomGeometry } from './queries.ts';

export function drawRooms(model: Model, view: View): Primitive[] {
  if (!categoryState(model.display, view, 'room').visible) return [];
  const labels = styleOfView(model.display, view).labels ?? {};
  const geo = allRoomGeometry(model, view.storeyId);
  return Object.values(model.rooms)
    .filter((r) => r.storeyId === view.storeyId && r.variant.kind === 'main')
    .flatMap((r) => {
      const g = geo.get(r.id);
      const eff = resolveGraphics(model.display, view, roomFacts(r)).effect;
      return g ? drawRoom(r, g, view.scale, model.display.paperSizes, labels, eff) : [];
    });
}
