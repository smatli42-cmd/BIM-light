// Účinné nastavení pohledu = styl + místní úpravy (základ 26; rozhodnutí 4: úprava je označená a jde vrátit).
import type { Id } from '../ids/index.ts';
import type { Category } from '../model/categories.ts';
import type { Model } from '../model/types.ts';
import type { Detail, DisplaySettings, Layer, LayerState, Style } from '../style/types.ts';
import type { View } from './types.ts';

export function styleOfView(display: DisplaySettings, view: View): Style {
  const style = display.styles[view.styleId];
  if (!style) throw new Error(`Pohled ${view.name} má neznámý styl`);
  return style;
}

/** Stav vrstvy v pohledu: místní úprava, jinak kombinace vrstev stylu, jinak viditelná. */
export function layerState(display: DisplaySettings, view: View, layerId: Id): LayerState {
  const local = view.local.layerStates?.[layerId];
  if (local) return local;
  const combo = display.layerCombinations[styleOfView(display, view).layerCombinationId];
  return combo?.states[layerId] ?? { visible: true, locked: false };
}

export const detailOf = (display: DisplaySettings, view: View): Detail =>
  view.local.detail ?? styleOfView(display, view).detail;

/** Modelová vrstva, do které kategorie spadá (vrstvy se prvkům nepřiřazují ručně). */
export function layerForCategory(display: DisplaySettings, category: Category): Layer | undefined {
  return Object.values(display.layers).find((l) => l.kind === 'category' && l.categories.includes(category));
}

/** Stav vrstvy kategorie; kategorie bez vrstvy je viditelná a odemčená. */
export function categoryState(display: DisplaySettings, view: View, category: Category): LayerState {
  const layer = layerForCategory(display, category);
  return layer ? layerState(display, view, layer.id) : { visible: true, locked: false };
}

/** Má pohled místní úpravy oproti stylu? („styl (upraveno)“) */
export function isViewModified(view: View): boolean {
  const l = view.local;
  return (
    Object.keys(l.layerStates ?? {}).length > 0 ||
    l.detail !== undefined ||
    l.overrideCombinationId !== undefined ||
    Object.keys(l.categoryGraphics ?? {}).length > 0
  );
}

/** Aktivní skupina anotací pohledu (nová kóta jde do ní). */
export function activeAnnotationLayer(model: Model, view: View): Id {
  return view.activeAnnotationLayerId ?? styleOfView(model.display, view).defaultAnnotationLayerId;
}
