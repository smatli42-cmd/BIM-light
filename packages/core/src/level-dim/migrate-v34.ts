// Migrace projektu 34 → 35 (hlášení uživatele: po přepnutí Studie → Projekt zmizely výškové kóty): skupina
// anotací „Výškové kóty“ viditelná ve všech stylech, výškové kóty v řezech i v půdorysu se do ní přesunou;
// výška textu výškové kóty na papíře (1,8 mm, drobný jako popis místnosti).
import { withLevelLayer } from '../style/presets/create.ts';
import { LEVEL_LAYER, PAPER_SIZES } from '../style/presets/defaults.ts';
import type { DisplaySettings } from '../style/types.ts';

type Obj = Record<string, unknown>;

const moved = (dims: unknown) =>
  Object.fromEntries(
    Object.entries((dims ?? {}) as Record<string, Obj>).map(([id, d]) => [
      id,
      { ...d, annotationLayerId: LEVEL_LAYER.id },
    ]),
  );

export function projectV34toV35(data: Obj): Obj {
  const display = data['display'] as DisplaySettings | undefined;
  const withLayer = display && withLevelLayer(display);
  return {
    ...data,
    levelDims: moved(data['levelDims']),
    planLevelDims: moved(data['planLevelDims']),
    ...(withLayer
      ? {
          display: {
            ...withLayer,
            paperSizes: { levelText: PAPER_SIZES.levelText, ...withLayer.paperSizes },
          },
        }
      : {}),
  };
}
