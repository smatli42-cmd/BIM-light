// Kresba pohledu: vše se počítá z modelu (základ 4). Styl mění jen vzhled (základ 26),
// měřítko jen tloušťky čar (základ 29) – ty ale určí až vykreslení přes tabulku per.
import { drawDimension } from '../dimension/draw.ts';
import type { Dimension } from '../dimension/types.ts';
import type { Drawing, Primitive } from '../drawing/primitives.ts';
import type { Id } from '../ids/index.ts';
import type { Model } from '../model/types.ts';
import { rulesFor } from '../rules/cross-rules.ts';
import { elementFacts, type ElementFacts } from '../style/conditions.ts';
import { resolveGraphics } from '../style/graphics.ts';
import { drawWalls as drawWallItems, type WallDrawItem } from '../wall/draw.ts';
import type { DrawLookup } from '../wall/draw-hatch.ts';
import { allWallGeometry } from '../wall/geometry.ts';
import { allWalls } from '../wall/queries.ts';
import { categoryState, detailOf, layerState, styleOfView } from './effective.ts';
import { scaleHatch } from '../hatch/scale.ts';
import type { Hatch } from '../hatch/types.ts';
import type { View } from './types.ts';
import { drawOpening, openingFacts } from '../opening/draw.ts';

/** Fakta o kótě pro funkci grafiky (anotace má kategorii „dimension“). */
export function dimensionFacts(d: Dimension): ElementFacts {
  return {
    id: d.id,
    category: 'dimension',
    discipline: '',
    status: '',
    variant: 'main',
    typeId: '',
    materialIds: [],
  };
}

/** Je kóta v pohledu vidět? Jen podle skupiny anotací; zámek platí i bez ohledu na to (základ 28). */
export const isDimensionVisible = (model: Model, view: View, d: Dimension): boolean =>
  d.storeyId === view.storeyId && layerState(model.display, view, d.annotationLayerId).visible;

function drawWalls(model: Model, view: View, merge: boolean): Primitive[] {
  const detail = detailOf(model.display, view);
  const geoms = allWallGeometry(model, view.storeyId, view.cutPlane);
  const items: WallDrawItem[] = [];
  const k = styleOfView(model.display, view).hatchScale ?? 1;
  const scaled = new Map<string, Hatch | undefined>();
  const look: DrawLookup = {
    material: (id) => model.materials[id],
    hatch: (id) => {
      if (!scaled.has(id)) {
        const h = model.display.hatches[id];
        scaled.set(id, h && scaleHatch(h, k));
      }
      return scaled.get(id);
    },
  };
  for (const w of allWalls(model)) {
    const geom = geoms.get(w.id);
    if (!geom || w.variant.kind !== 'main') continue;
    if (!categoryState(model.display, view, w.category).visible) continue;
    const g = resolveGraphics(model.display, view, elementFacts(model, w)).effect;
    if (g.visible) items.push({ geom, g });
  }
  return drawWallItems(items, detail, look, merge);
}

/** Otvory mimo rovinu řezu (čárkovaně, plán stěn Z4). */
function drawOpenings(model: Model, view: View): Primitive[] {
  const out: Primitive[] = [];
  for (const o of Object.values(model.openings)) {
    if (o.storeyId !== view.storeyId || o.variant.kind !== 'main') continue;
    if (!categoryState(model.display, view, 'opening').visible) continue;
    const g = resolveGraphics(model.display, view, openingFacts(o)).effect;
    if (g.visible) out.push(...drawOpening(model, o, view.cutPlane, g));
  }
  return out;
}

/** Kresba pohledu jako seznam primitiv. */
/** Volby zobrazení okna (ne data pohledu): průchozí materiál (výchozí zapnuto). */
export interface DrawOptions {
  readonly mergeMaterials?: boolean;
}

export function drawView(model: Model, viewId: Id, options: DrawOptions = {}): Drawing {
  const view = model.views[viewId];
  if (!view) throw new Error(`Pohled ${viewId} neexistuje`);
  const out = [...drawWalls(model, view, options.mergeMaterials ?? true), ...drawOpenings(model, view)];
  for (const d of Object.values(model.dimensions)) {
    if (!isDimensionVisible(model, view, d)) continue;
    const g = resolveGraphics(model.display, view, dimensionFacts(d)).effect;
    out.push(...drawDimension(model, d, view.scale, model.display.paperSizes, g));
  }
  return { scale: view.scale, primitives: out };
}

/** Jde prvek nebo kóta v pohledu vybrat? Zamčená nebo skrytá vrstva = ne. */
export function isSelectable(model: Model, view: View, id: Id): boolean {
  const el = model.elements[id];
  if (el) {
    const s = categoryState(model.display, view, el.category);
    return rulesFor(el.category).selectable && el.storeyId === view.storeyId && s.visible && !s.locked;
  }
  const o = model.openings[id];
  if (o) {
    const s = categoryState(model.display, view, 'opening');
    return rulesFor('opening').selectable && o.storeyId === view.storeyId && s.visible && !s.locked;
  }
  const d = model.dimensions[id];
  if (!d) return false;
  const s = layerState(model.display, view, d.annotationLayerId);
  return rulesFor('dimension').selectable && d.storeyId === view.storeyId && s.visible && !s.locked;
}
