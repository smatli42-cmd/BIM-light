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
import { SLOT_GROUP } from './groups.ts';

/**
 * Fakta o elektro prvku pro funkci grafiky (podmínky pravidel: kategorie, profese, skupina…). `groupId`
 * = skupina slotu rámečku, když se liší od skupiny typu.
 */
export function electroFacts(m: Model, el: ElectroElement, groupId?: string): ElementFacts {
  const t = m.electroTypes[el.typeId];
  const group = m.electroGroups[groupId ?? t?.groupId ?? ''];
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
  const base = {
    scale: view.scale,
    detail: detailOf(m.display, view),
    paper: m.display.paperSizes,
    marks: style.labels['electroMarks'] !== false,
    heights: style.labels['electroHeights'] !== false,
  };
  const effect = (el: ElectroElement, groupId?: string) =>
    resolveGraphics(m.display, view, electroFacts(m, el, groupId)).effect;
  return Object.values(m.electroElements ?? {}).flatMap((el) => {
    if (el.storeyId !== view.storeyId || el.variant.kind !== 'main') return [];
    const own = m.electroTypes[el.typeId]?.groupId;
    const o: ElectroDrawOptions = {
      ...base,
      slotEffect: (glyph) => {
        const gid = SLOT_GROUP[glyph];
        return gid && gid !== own ? effect(el, gid) : undefined;
      },
    };
    return drawElectroElement(m, el, effect(el), o);
  });
}
