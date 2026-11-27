// Výchozí grafika projektu (patro 1) a velikosti na papíře. Data, ne kód generátoru (základy 11, 29, 32).
// Přiřazení per podle katalogu pohledů: řez 5 (0,5), pohled 3 (0,25), značky 2, tenké 1 (kóty, šrafy).
// Obrys řezu stěny a sloupu = pero 6 (0,7), velmi tlustá podle ČSN 01 3420 (pokyn uživatele 2026-11-24).
import type { CategoryGraphics, GraphicEffect, PaperSizes, ResolvedEffect } from '../types.ts';

export const BASE_GRAPHICS: ResolvedEffect = {
  visible: true,
  cutPen: 5,
  projectionPen: 3,
  layerPen: 1,
  lineColor: '#000000',
  lineType: 'solid',
  fillColor: null,
  surfaceColor: null,
  surfaceTransparency: null,
  hatch: 'none',
  transparency: 0,
  endLines: true,
  refLine: false,
};

export const CATEGORY_GRAPHICS: CategoryGraphics = {
  wall: { cutPen: 6, projectionPen: 3, layerPen: 1, hatch: 'material' },
  column: { cutPen: 6, projectionPen: 3, layerPen: 1, hatch: 'material' },
  slab: { projectionPen: 2, cutPen: 5, hatch: 'material' },
  window: { projectionPen: 3 },
  door: { projectionPen: 3 },
  symbol: { projectionPen: 2 },
  dimension: { projectionPen: 1, cutPen: 1 },
  label: { projectionPen: 1 },
  'drawing-2d': { projectionPen: 1 },
};

/** Vzdálená oblast řezu: tenké pero a šedá čára (katalog pohledů: pohled tence). */
export const FAR_AREA_GRAPHICS: GraphicEffect = { projectionPen: 1, lineColor: '#808080' };

/** Skupina anotací pro značky řezů a pohledů (stálé id, viditelná ve všech stylech). */
export const SECTION_LAYER = { id: 'ann-sections', name: 'Řezy a pohledy' } as const;

/** Razítko místnosti (ČSN 01 3420, výkresy 1:50 / 1:100): číslo 2,5 mm tučně, ostatní 1,8 mm, řádkování 1,3. */
export const ROOM_PAPER_SIZES = { roomNumberText: 2.5, roomText: 1.8, roomLineSpacing: 1.3 } as const;

/** Výchozí velikosti textů a značek na papíře v mm (čísla kót 2,5 mm). */
export const PAPER_SIZES: PaperSizes = {
  dimensionText: 2.5,
  labelText: 2.5,
  dimensionTick: 2,
  dimensionTextGap: 0.8,
  extensionGap: 1,
  extensionOvershoot: 1.5,
  levelMark: 2.5,
  ...ROOM_PAPER_SIZES,
};
