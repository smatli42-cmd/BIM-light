// Výběr místnosti (jako Revit: klik dovnitř obrysu nebo na razítko). Zkouší se až po stěnách a deskách,
// protože místnost leží pod nimi; razítko má přednost před vším (je nahoře).
import type { Vec2 } from '../geometry/index.ts';
import type { Id } from '../ids/index.ts';
import type { Model } from '../model/types.ts';
import { pointInPolygon } from '../selection/pick.ts';
import { isSelectable } from '../view/draw-view.ts';
import { styleOfView } from '../view/effective.ts';
import type { View } from '../view/types.ts';
import { stampBox, stampCenter, stampLines } from './draw.ts';
import { allRoomGeometry } from './queries.ts';
import { stampFields } from './stamp.ts';

const selectable = (model: Model, view: View) =>
  Object.values(model.rooms).filter((r) => r.variant.kind === 'main' && isSelectable(model, view, r.id));

/** Obrysy místností, které jde vybrat (výběr rámečkem). */
export function selectableRoomOutlines(model: Model, view: View) {
  const geo = allRoomGeometry(model, view.storeyId);
  return selectable(model, view).map((r) => ({ id: r.id, outline: geo.get(r.id)?.outline ?? [] }));
}

/** Místnosti, jejichž razítko leží pod bodem. */
export function roomStampsAt(model: Model, view: View, p: Vec2, tol: number): Id[] {
  const fields = stampFields(styleOfView(model.display, view));
  const geo = allRoomGeometry(model, view.storeyId);
  return selectable(model, view)
    .filter((r) => {
      const g = geo.get(r.id);
      if (!g) return false;
      const b = stampBox(stampLines(model, r, g, fields), view.scale, model.display.paperSizes);
      const c = stampCenter(r);
      return Math.abs(p.x - c.x) <= b.halfW + tol && Math.abs(p.y - c.y) <= b.halfH + tol;
    })
    .map((r) => r.id);
}

/** Místnosti, do jejichž obrysu bod padne (mimo ostrovy). */
export function roomsAt(model: Model, view: View, p: Vec2): Id[] {
  const geo = allRoomGeometry(model, view.storeyId);
  return selectable(model, view)
    .filter((r) => {
      const g = geo.get(r.id);
      return !!g && pointInPolygon(p, g.outline) && !g.holes.some((h) => pointInPolygon(p, h));
    })
    .map((r) => r.id);
}
