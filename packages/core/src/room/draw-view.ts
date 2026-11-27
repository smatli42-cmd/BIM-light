// Místnosti v kresbě pohledu: podlaží pohledu, hlavní model, viditelná vrstva „Místnosti“, filtr
// rekonstrukce a pravidla přes funkci grafiky; velikosti a volby razítka ze stylu pohledu.
import type { Primitive } from '../drawing/primitives.ts';
import type { Model } from '../model/types.ts';
import { resolveGraphics } from '../style/graphics.ts';
import { categoryState, styleOfView } from '../view/effective.ts';
import type { View } from '../view/types.ts';
import { drawRoom, roomFacts } from './draw.ts';
import { allRoomGeometry } from './queries.ts';
import { stampFields } from './stamp.ts';

export function drawRooms(model: Model, view: View): Primitive[] {
  if (!categoryState(model.display, view, 'room').visible) return [];
  const fields = stampFields(styleOfView(model.display, view));
  const geo = allRoomGeometry(model, view.storeyId);
  return Object.values(model.rooms)
    .filter((r) => r.storeyId === view.storeyId && r.variant.kind === 'main')
    .flatMap((r) => {
      const g = geo.get(r.id);
      const eff = resolveGraphics(model.display, view, roomFacts(model, r)).effect;
      return g ? drawRoom(model, r, g, view.scale, fields, eff) : [];
    });
}
