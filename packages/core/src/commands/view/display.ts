// Příkazy nad nastavením zobrazení: Uložit jako styl, import balíčku, tabulka per.
// Žádný z nich nemění prvky modelu (základ 31).
import type { Id } from '../../ids/index.ts';
import { putView, setDisplay } from '../../model/update.ts';
import { mergeDisplay, type ImportMode } from '../../style/package-merge.ts';
import { parseDisplayPackage } from '../../style/package.ts';
import { withPenWidth } from '../../style/pens.ts';
import type { Style } from '../../style/types.ts';
import { detailOf, layerState } from '../../view/effective.ts';
import { styleOf, viewOf } from '../lookup.ts';
import { S } from '../schema.ts';
import { defineCommand, fail } from '../types.ts';

export const styleSaveFromView = defineCommand<{ viewId: Id; name: string }>({
  name: 'style.saveFromView',
  label: 'Uložit jako styl',
  description:
    'Uloží aktuální stav pohledu (styl + místní úpravy) jako nový styl a pohled ho začne používat.',
  group: 'Zobrazení',
  params: S.object({ viewId: S.id, name: { type: 'string' } }, ['viewId', 'name']),
  run(model, p, ctx) {
    const d = model.display;
    const view = viewOf(model, p.viewId);
    const style = styleOf(model, view.styleId);
    if (!p.name.trim()) fail('invalid', 'Styl musí mít název');
    const states = Object.fromEntries(Object.keys(d.layers).map((id) => [id, layerState(d, view, id)]));
    const combo = { id: ctx.newId(), name: p.name, states };
    const next: Style = {
      ...style,
      id: ctx.newId(),
      name: p.name,
      layerCombinationId: combo.id,
      detail: detailOf(d, view),
      overrideCombinationId: view.local.overrideCombinationId ?? style.overrideCombinationId,
      categoryGraphics: { ...style.categoryGraphics, ...view.local.categoryGraphics },
    };
    const display = {
      ...d,
      layerCombinations: { ...d.layerCombinations, [combo.id]: combo },
      styles: { ...d.styles, [next.id]: next },
    };
    const m = putView(setDisplay(model, display), { ...view, styleId: next.id, local: {} });
    return { model: m, created: [next.id, combo.id] };
  },
});

export const displayImport = defineCommand<{ json: string; mode: ImportMode }>({
  name: 'display.import',
  label: 'Import nastavení zobrazení',
  description:
    'Načte balíček zobrazení (JSON): styly, vrstvy, pravidla, kombinace, pera. Při shodě názvů nahradí, ' +
    'nebo ponechá obě. Prvky modelu se nikdy nemění; neplatný soubor nic nezmění.',
  group: 'Zobrazení',
  params: S.object({ json: { type: 'string' }, mode: S.enumOf(['replace', 'keep-both'], 'shoda názvů') }, [
    'json',
    'mode',
  ]),
  run(model, p, ctx) {
    const parsed = parseDisplayPackage(p.json);
    if (!parsed.ok) return fail('invalid', `Import se neprovedl: ${parsed.errors.join('; ')}`);
    return { model: setDisplay(model, mergeDisplay(model.display, parsed.settings, p.mode, ctx.newId)) };
  },
});

export const displaySetPenWidth = defineCommand<{ pen: number; scale: number; mm: number }>({
  name: 'display.setPenWidth',
  label: 'Tloušťka pera',
  description: 'Změní tloušťku pera (mm na papíře) pro jedno měřítko; změní se všechny čáry s tímto perem.',
  group: 'Zobrazení',
  params: S.object(
    {
      pen: { type: 'integer', minimum: 1 },
      scale: S.number('měřítko', { exclusiveMinimum: 0 }),
      mm: S.number('mm', { exclusiveMinimum: 0 }),
    },
    ['pen', 'scale', 'mm'],
  ),
  run(model, p) {
    try {
      const penTable = withPenWidth(model.display.penTable, p.pen, p.scale, p.mm);
      return { model: setDisplay(model, { ...model.display, penTable }) };
    } catch (e) {
      return fail('invalid', (e as Error).message);
    }
  },
});
