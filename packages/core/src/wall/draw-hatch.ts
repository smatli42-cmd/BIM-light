// Šrafa vrstvy stěny (základy 11, 34): tvar šrafy z projektu, barvy z materiálu, nebo z přepisu
// (pravidlo, přepis prvku). Generátor nevolí barvu ani pero sám, vše dostane z grafiky a materiálu.
import type { Primitive } from '../drawing/primitives.ts';
import type { Hatch } from '../hatch/types.ts';
import { NO_HATCH } from '../hatch/registry.ts';
import type { Id } from '../ids/index.ts';
import { materialFill, materialLines } from '../material/colors.ts';
import type { Material } from '../material/types.ts';
import type { ResolvedEffect } from '../style/types.ts';
import type { LayerGeometry } from './geometry.ts';

/** Kde kresba najde materiály a šrafy projektu. */
export interface DrawLookup {
  readonly material: (id: Id) => Material | undefined;
  readonly hatch: (id: string) => Hatch | undefined;
}

/** Společný počátek rastru šraf v souřadnicích modelu (sousední stěny na sebe navazují). */
export const HATCH_ORIGIN = { x: 0, y: 0 } as const;

/** Šrafa (s výplní) jedné vrstvy, nebo nic. */
export function layerHatch(
  layer: LayerGeometry,
  g: ResolvedEffect,
  look: DrawLookup,
  wallId: Id,
): Primitive[] {
  if (g.hatch === 'none') return [];
  const m = look.material(layer.span.layer.materialId);
  const own = g.hatch === 'material' ? null : g.hatch;
  const hatchId = own?.hatchId ?? m?.hatchId ?? NO_HATCH;
  const hatch = look.hatch(hatchId) ?? look.hatch(NO_HATCH);
  if (!hatch) return [];
  const lineColor = own?.lineColor ?? (m ? materialLines(m) : g.lineColor);
  const fillColor = own?.fillColor ?? g.fillColor ?? (m ? materialFill(m) : null);
  return [
    {
      kind: 'hatch',
      polygon: layer.polygon,
      hatch,
      pen: own?.pen ?? m?.hatchPen ?? g.layerPen,
      lineColor,
      fillColor,
      origin: HATCH_ORIGIN,
      source: { elementId: wallId, role: 'šrafa' },
    },
  ];
}
