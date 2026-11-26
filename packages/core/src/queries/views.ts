// Dotaz pro AI: pohled a jeho účinné zobrazení (styl, upraveno, podrobnost, vrstvy, skupina anotací).
import { S } from '../commands/schema.ts';
import { fail } from '../commands/types.ts';
import {
  activeAnnotationLayer,
  detailOf,
  isViewModified,
  layerState,
  styleOfView,
} from '../view/effective.ts';
import { defineQuery } from './types.ts';

export const viewInfo = defineQuery<{ viewId: string }, unknown>({
  name: 'view.info',
  label: 'Zobrazení pohledu',
  description:
    'Vrátí pohled: podlaží, styl, zda má místní úpravy („upraveno“), podrobnost, měřítko, aktivní skupinu ' +
    'anotací (kam jdou nové kóty), stav každé vrstvy (viditelná / zamčená, druh kategorie / anotace), ' +
    'použitou kombinaci grafických přepisů a dostupné (overrideCombinations), filtr rekonstrukce ' +
    '(phaseFilterId, null = vše) a dostupné předvolby fází (phaseFilters).',
  group: 'Zobrazení',
  params: S.object({ viewId: S.id }, ['viewId']),
  run(m, p) {
    const v = m.views[p.viewId] ?? fail('not-found', `Pohled ${p.viewId} neexistuje`);
    const d = m.display;
    return {
      id: v.id,
      name: v.name,
      storeyId: v.storeyId,
      style: { id: v.styleId, name: styleOfView(d, v).name },
      modified: isViewModified(v),
      detail: detailOf(d, v),
      scale: v.scale,
      activeAnnotationLayerId: activeAnnotationLayer(m, v),
      overrideCombinationId: v.local.overrideCombinationId ?? styleOfView(d, v).overrideCombinationId,
      overrideCombinations: Object.values(d.overrideCombinations)
        .filter((c) => !c.phase)
        .map((c) => ({ id: c.id, name: c.name })),
      phaseFilterId: v.phaseFilterId,
      phaseFilters: Object.values(d.overrideCombinations)
        .filter((c) => c.phase)
        .map((c) => ({ id: c.id, name: c.name })),
      layers: Object.values(d.layers).map((l) => ({
        id: l.id,
        name: l.name,
        kind: l.kind,
        ...layerState(d, v, l.id),
      })),
    };
  },
});
