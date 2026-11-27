// Šrafa vrstvy stěny (základy 11, 34): tvar šrafy z projektu, barvy z materiálu, nebo z přepisu
// (pravidlo, přepis prvku). Generátor nevolí barvu ani pero sám, vše dostane z grafiky a materiálu.
import type { Primitive } from '../drawing/primitives.ts';
import { bandCurves, type BandFrame } from '../hatch/band.ts';
import type { Hatch } from '../hatch/types.ts';
import { NO_HATCH } from '../hatch/registry.ts';
import type { Id } from '../ids/index.ts';
import { materialFill, materialLines } from '../material/colors.ts';
import type { Material } from '../material/types.ts';
import type { ResolvedEffect } from '../style/types.ts';
import type { Vec2 } from '../geometry/index.ts';
import type { LayerGeometry, WallGeometry } from './geometry.ts';

/** Kde kresba najde materiály a šrafy projektu. */
export interface DrawLookup {
  readonly material: (id: Id) => Material | undefined;
  readonly hatch: (id: string) => Hatch | undefined;
}

/** Společný počátek rastru šraf v souřadnicích modelu (sousední stěny na sebe navazují). */
export const HATCH_ORIGIN = { x: 0, y: 0 } as const;

/** Kde leží pás vrstvy pro šrafu přes šířku; konec křivky přesahuje osu o tloušťku stěny (rohy). */
export function layerBandFrame(geom: WallGeometry, layer: LayerGeometry): BandFrame {
  const { from, to } = layer.span;
  return { path: geom.path, sideA: from, sideB: to, extend: geom.section.thickness + Math.abs(to - from) };
}

/** Křivky rodin „pás“ šrafy pro danou vrstvu (prázdné, když šrafa žádný pás nemá). */
export function hatchBandCurves(hatch: Hatch, frame: BandFrame): Vec2[][] {
  return hatch.families.flatMap((f) => (f.kind === 'band' ? bandCurves(f, frame) : []));
}

/** Šrafa (s výplní) jednoho mnohoúhelníku vrstvy, nebo nic. */
export const layerHatch = (
  layer: LayerGeometry,
  polygon: readonly Vec2[],
  g: ResolvedEffect,
  look: DrawLookup,
  wallId: Id,
  frame?: BandFrame,
): Primitive[] => materialHatch(layer.span.layer.materialId, polygon, g, look, wallId, frame);

/** Šrafa (s výplní) mnohoúhelníku z materiálu, nebo z přepisu grafiky (stěny v půdorysu, řez). */
export function materialHatch(
  materialId: Id,
  polygon: readonly Vec2[],
  g: ResolvedEffect,
  look: DrawLookup,
  elementId: Id,
  frame?: BandFrame,
): Primitive[] {
  if (g.hatch === 'none') return [];
  const m = look.material(materialId);
  const own = g.hatch === 'material' ? null : g.hatch;
  const hatchId = own?.hatchId ?? m?.hatchId ?? NO_HATCH;
  const hatch = look.hatch(hatchId) ?? look.hatch(NO_HATCH);
  if (!hatch) return [];
  const lineColor = own?.lineColor ?? (m ? materialLines(m) : g.lineColor);
  const fillColor = own?.fillColor ?? g.fillColor ?? (m ? materialFill(m) : null);
  const curves = frame ? hatchBandCurves(hatch, frame) : [];
  return [
    {
      kind: 'hatch',
      polygon,
      hatch,
      pen: own?.pen ?? m?.hatchPen ?? g.layerPen,
      lineColor,
      fillColor,
      origin: HATCH_ORIGIN,
      ...(curves.length ? { curves } : {}),
      source: { elementId, role: 'šrafa' },
    },
  ];
}
