// Spárořez dlažby v půdorysu (prvky stavby 9): osy spár podlah místností jako tenké čáry. Pero, barva a
// viditelnost vždy z funkce grafiky (základ 11) – kategorie úprav povrchů (vrstva Desky), barva spáry typu
// je vlastní výchozí grafika (patro 1). Zapíná se ve stylu (`tileJoints`); výchozí jen u střední a jemné
// podrobnosti (styl Projekt), Studie spárořez nekreslí.
import type { Primitive } from '../drawing/primitives.ts';
import type { Model } from '../model/types.ts';
import { resolveGraphics } from '../style/graphics.ts';
import { categoryState, detailOf, styleOfView } from '../view/effective.ts';
import type { View } from '../view/types.ts';
import { coveringFacts } from './color.ts';
import { roomTiling } from './tiles.ts';

/** Kreslí pohled spárořez? Volba stylu, jinak podle podrobnosti pohledu (hrubá ne). */
export const showsTileJoints = (model: Model, view: View): boolean =>
  styleOfView(model.display, view).tileJoints ?? detailOf(model.display, view) !== 'coarse';

export function drawTileJoints(model: Model, view: View): Primitive[] {
  if (!showsTileJoints(model, view)) return [];
  if (!categoryState(model.display, view, 'covering').visible) return [];
  return Object.values(model.rooms)
    .filter((r) => r.storeyId === view.storeyId && r.variant.kind === 'main')
    .flatMap((r) =>
      roomTiling(model, r)
        .filter((t) => t.surface.place === 'floor')
        .flatMap((t): Primitive[] => {
          const facts = { ...coveringFacts(r, t.type), ownDefault: { lineColor: t.tile.jointColor } };
          const e = resolveGraphics(model.display, view, facts).effect;
          if (!e.visible) return [];
          const stroke = { pen: e.layerPen, color: e.lineColor, lineType: e.lineType };
          // Podlaha leží v rovině půdorysu: u = x, v = y (covering/frame.ts, horizontalPlane).
          return t.layout.joints.map((s) => ({
            kind: 'line',
            points: [s.a, s.b],
            closed: false,
            stroke,
            source: { elementId: r.id, role: 'spárořez' },
          }));
        }),
    );
}
