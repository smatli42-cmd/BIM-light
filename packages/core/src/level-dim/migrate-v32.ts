// Migrace projektu 32 → 33: výškové kóty v řezech (prázdný seznam) a výška praporku výškové kóty na papíře
// (ČSN 01 3420: 2,5 mm) v nastavení zobrazení, pokud chybí.
import { PAPER_SIZES } from '../style/presets/defaults.ts';

type Obj = Record<string, unknown>;

export function projectV32toV33(data: Obj): Obj {
  const display = data['display'] as Obj | undefined;
  const sizes = (display?.['paperSizes'] ?? {}) as Obj;
  return {
    ...data,
    levelDims: data['levelDims'] ?? {},
    ...(display
      ? { display: { ...display, paperSizes: { levelMark: PAPER_SIZES.levelMark, ...sizes } } }
      : {}),
  };
}
