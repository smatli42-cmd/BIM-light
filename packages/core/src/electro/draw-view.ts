// Elektro prvky v půdorysu pohledu: viditelnost podle vrstvy Elektro (kategorie „electrical“, koncepce 4),
// grafika z funkce pater přepisů (základ 11) – výchozí barva je barva skupiny legendy (patro 1).
import type { Primitive } from '../drawing/primitives.ts';
import type { Model } from '../model/types.ts';
import { variantKey, type ElementFacts } from '../style/conditions.ts';
import { resolveGraphics } from '../style/graphics.ts';
import { categoryState, detailOf, styleOfView } from '../view/effective.ts';
import type { View } from '../view/types.ts';
import { drawElectroElement, type ElectroDrawOptions } from './draw.ts';
import type { ElectroElement } from './types.ts';

/** Fakta o elektro prvku pro funkci grafiky (podmínky pravidel: kategorie, profese, skupina…). */
export function electroFacts(m: Model, el: ElectroElement): ElementFacts {
  const t = m.electroTypes[el.typeId];
  const group = t ? m.electroGroups[t.groupId] : undefined;
  return {
    id: el.id,
    category: 'electrical',
    discipline: el.discipline,
    status: el.status,
    variant: variantKey(el.variant),
    typeId: el.typeId,
    materialIds: [],
    ...(group
      ? {
          electroGroup: group.id,
          ownDefault: { lineColor: group.color },
          ownDefaultSource: `skupina ${group.name}`,
        }
      : {}),
    ...(el.graphicOverride ? { graphicOverride: el.graphicOverride } : {}),
  };
}

export function drawElectro(m: Model, view: View): Primitive[] {
  if (!categoryState(m.display, view, 'electrical').visible) return [];
  const style = styleOfView(m.display, view);
  const o: ElectroDrawOptions = {
    scale: view.scale,
    detail: detailOf(m.display, view),
    paper: m.display.paperSizes,
    marks: style.labels['electroMarks'] !== false,
    heights: style.labels['electroHeights'] !== false,
  };
  return Object.values(m.electroElements ?? {}).flatMap((el) => {
    if (el.storeyId !== view.storeyId || el.variant.kind !== 'main') return [];
    return drawElectroElement(m, el, resolveGraphics(m.display, view, electroFacts(m, el)).effect, o);
  });
}
