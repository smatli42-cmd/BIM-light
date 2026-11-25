// Vrstvy ze spodní lišty (koncepce rozhraní, část 2 G): kombinace vrstev a rychlé volby. Vše přes
// příkazy jádra (view.setLayerCombination, view.setLayerStates) – jeden krok Zpět.
import { layerForCategory, layerState, styleOfView, type Id } from '@bim-light/core';
import type { Session } from '../../session/session.ts';

/** Název aktuální kombinace vrstev okna (nebo „upraveno“). */
export function comboLabel(s: Session): string {
  const d = s.model.display;
  const local = s.view.local.layerStates;
  const styleCombo = d.layerCombinations[styleOfView(d, s.view).layerCombinationId];
  if (!local) return styleCombo?.name ?? 'Vše';
  const same = Object.values(d.layerCombinations).find(
    (c) => JSON.stringify(c.states) === JSON.stringify(local),
  );
  return same?.name ?? 'upraveno';
}

/** Vrstvy vybraných prvků (stěny, otvory podle kategorie; kóty podle skupiny anotací). */
function selectedLayers(s: Session): Id[] {
  const d = s.model.display;
  const ids = new Set<Id>();
  const add = (id: Id | undefined) => id && ids.add(id);
  if (s.selection.walls.length) add(layerForCategory(d, 'wall')?.id);
  if (s.selection.openings.length) add(layerForCategory(d, 'opening')?.id);
  for (const id of s.selection.dims) add(s.model.dimensions[id]?.annotationLayerId);
  return [...ids];
}

const setStates = (s: Session, states: Record<Id, { visible: boolean }>) =>
  s.run('view.setLayerStates', { viewId: s.view.id, states });

/** Přepnout zobrazené / skryté (\). */
export function invertLayers(s: Session) {
  const d = s.model.display;
  const states = Object.fromEntries(
    Object.keys(d.layers).map((id) => [id, { visible: !layerState(d, s.view, id).visible }]),
  );
  setStates(s, states);
}

/** Skrýt vrstvy označených prvků (`others` = naopak skrýt všechny ostatní). */
export function hideSelectedLayers(s: Session, others: boolean) {
  const sel = new Set(selectedLayers(s));
  if (!sel.size) return s.toast('Nejdřív vyber prvky.', 'bad');
  const ids = Object.keys(s.model.display.layers).filter((id) => sel.has(id) !== others);
  setStates(s, Object.fromEntries(ids.map((id) => [id, { visible: false }])));
}

const LAYER_LABELS = new Set(['Vrstvy v pohledu', 'Vrstva v pohledu', 'Kombinace vrstev']);

/** Je poslední krok Zpět změna vrstev? */
export const lastIsLayerChange = (s: Session) =>
  LAYER_LABELS.has(s.editor.history[s.editor.history.length - 1] ?? '');
