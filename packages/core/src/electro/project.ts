// Elektro data nového projektu a migrace 36 → 37 (koncepce 3): skupiny legendy, kopie knihovny typů
// (stálá id, základ 21), žádné prvky; do nastavení zobrazení sada Elektro (koncepce 4).
import type { DisplaySettings } from '../style/types.ts';
import { withElectroDisplay } from './display.ts';
import { defaultElectroGroups } from './groups.ts';
import { electroLibraryTypes } from './library.ts';

export const emptyElectroData = () => ({
  electroGroups: defaultElectroGroups(),
  electroTypes: electroLibraryTypes(),
  electroElements: {},
});

type Obj = Record<string, unknown>;

export function projectV36toV37(data: Obj): Obj {
  const display = data['display'] as DisplaySettings | undefined;
  return {
    ...data,
    electroGroups: data['electroGroups'] ?? defaultElectroGroups(),
    electroTypes: data['electroTypes'] ?? electroLibraryTypes(),
    electroElements: data['electroElements'] ?? {},
    ...(display ? { display: withElectroDisplay(display) } : {}),
  };
}
