// Filtr rekonstrukce pohledu (fáze; vzor Arditu – Nastavení pohledu, 2026-11-26): stávající stav,
// bourací práce, plánovaný stav, nový stav, srovnávací, nebo vše. Platí vedle grafických přepisů.
import type { Id } from '../../ids/index.ts';
import { putView } from '../../model/update.ts';
import { viewOf } from '../lookup.ts';
import { S } from '../schema.ts';
import { defineCommand, fail } from '../types.ts';

export const viewSetPhaseFilter = defineCommand<{ viewId: Id; filterId: Id | null }>({
  name: 'view.setPhaseFilter',
  label: 'Filtr rekonstrukce',
  description:
    'Nastaví pohledu filtr rekonstrukce (fázi): id předvolby fáze z view.info (phaseFilters), nebo null ' +
    '= vše bez filtru. Stav prvků (stávající / bourání / nový) se nastavuje u prvku. Grafické přepisy ' +
    'pohledu zůstávají.',
  group: 'Zobrazení',
  params: S.object({ viewId: S.id, filterId: { oneOf: [S.id, { type: 'null' }] } }, ['viewId', 'filterId']),
  run(model, p) {
    const view = viewOf(model, p.viewId);
    if (p.filterId !== null && model.display.overrideCombinations[p.filterId]?.phase !== true)
      fail('not-found', `Předvolba fáze ${p.filterId} neexistuje`);
    return { model: putView(model, { ...view, phaseFilterId: p.filterId }) };
  },
});
