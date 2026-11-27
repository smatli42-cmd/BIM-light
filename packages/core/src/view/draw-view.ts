// Kresba pohledu: vše se počítá z modelu (základ 4). Styl mění jen vzhled (základ 26),
// měřítko jen tloušťky čar (základ 29) – ty ale určí až vykreslení přes tabulku per.
import { findWall } from '../wall/queries.ts';
import { drawDimension } from '../dimension/draw.ts';
import type { Dimension } from '../dimension/types.ts';
import type { Drawing, Primitive } from '../drawing/primitives.ts';
import type { Id } from '../ids/index.ts';
import type { Model } from '../model/types.ts';
import { rulesFor } from '../rules/cross-rules.ts';
import { type ElementFacts } from '../style/conditions.ts';
import { resolveGraphics } from '../style/graphics.ts';
import { wallCutRelation } from '../wall/cut.ts';
import { visibleWalls } from './visible-walls.ts';
import { drawWalls as drawWallItems, type WallDrawItem } from '../wall/draw.ts';
import { drawProjected, drawRefLine, filterLayers, type Structure } from '../wall/draw-extras.ts';
import type { DrawLookup } from '../wall/draw-hatch.ts';
import { allWallGeometry } from '../wall/geometry.ts';
import { categoryState, detailOf, layerState, styleOfView } from './effective.ts';
import { scaleHatch } from '../hatch/scale.ts';
import type { Hatch } from '../hatch/types.ts';
import type { View } from './types.ts';
import { wallProperties } from '../wall-props/resolve.ts';
import { drawOpening, openingFacts } from '../opening/draw.ts';
import { drawRenovationPatches } from '../opening/renovation.ts';
import { drawWallTag, tagFacts } from '../tag/draw.ts';
import { drawSlabs } from '../slab/draw-view.ts';

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

function drawWalls(model: Model, view: View, merge: boolean, structure: Structure): Primitive[] {
  const detail = detailOf(model.display, view);
  const vis = visibleWalls(model, view);
  const geoms = allWallGeometry(vis.model, view.storeyId, view.cutPlane);
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
  const extra: Primitive[] = [];
  for (const { wall: w, g } of vis.shown) {
    const geom = geoms.get(w.id);
    if (!geom) continue;
    if (structure === 'bearing-core' && !wallProperties(model, w).loadBearing) continue;
    // Plán stěn Z6: jen stěna, kterou protíná rovina řezu, se kreslí v řezu (výplň, šrafy, vrstvy).
    const cut = wallCutRelation(model, w, view.cutPlane);
    if (cut === 'cut') items.push({ geom: filterLayers(geom, structure), g });
    else extra.push(...drawProjected(geom, g, cut));
    extra.push(...drawRefLine(geom, g));
  }
  return [...drawWallItems(items, detail, look, merge), ...extra];
}

/** Je hostitel nosná stěna? (Jen jádro nosných skryje otvory nenosných stěn, plán stěn Z7.) */
function hostBearing(model: Model, hostId: Id): boolean {
  const host = findWall(model, hostId);
  return !!host && wallProperties(model, host).loadBearing;
}

/** Otvory mimo rovinu řezu (čárkovaně, plán stěn Z4). */
function drawOpenings(model: Model, view: View, structure: Structure): Primitive[] {
  const out: Primitive[] = [];
  const hidden = visibleWalls(model, view).hidden;
  for (const o of Object.values(model.openings)) {
    if (o.storeyId !== view.storeyId || o.variant.kind !== 'main' || hidden.has(o.hostId)) continue;
    if (structure === 'bearing-core' && !hostBearing(model, o.hostId)) continue;
    if (!categoryState(model.display, view, 'opening').visible) continue;
    const g = resolveGraphics(model.display, view, openingFacts(o)).effect;
    if (g.visible) out.push(...drawOpening(model, o, view.cutPlane, g));
  }
  return out;
}

/** Značky typu stěn podlaží (Z8): viditelnost podle skupiny anotací, stěna musí být vidět. */
function drawTags(model: Model, view: View): Primitive[] {
  const hidden = visibleWalls(model, view).hidden;
  return Object.values(model.wallTags).flatMap((t) => {
    if (t.storeyId !== view.storeyId || hidden.has(t.wallId)) return [];
    if (!layerState(model.display, view, t.annotationLayerId).visible) return [];
    const g = resolveGraphics(model.display, view, tagFacts(t)).effect;
    return drawWallTag(model, t, view.scale, model.display.paperSizes, g);
  });
}

/** Volby zobrazení okna (ne data pohledu): průchozí materiál (výchozí zapnuto). */
export interface DrawOptions {
  readonly mergeMaterials?: boolean;
  /** Konstrukční zobrazení: celá skladba (výchozí), bez povrchů, jen jádro, jen jádro nosných. */
  readonly structure?: Structure;
}

export function drawView(model: Model, viewId: Id, options: DrawOptions = {}): Drawing {
  const view = model.views[viewId];
  if (!view) throw new Error(`Pohled ${viewId} neexistuje`);
  const walls = drawWalls(model, view, options.mergeMaterials ?? true, options.structure ?? 'all');
  const structure = options.structure ?? 'all';
  // Záplaty rekonstrukce kryjí celou tloušťku stěny – jen při zobrazení celé skladby.
  const patches =
    structure === 'all' ? drawRenovationPatches(model, view, visibleWalls(model, view).shown) : [];
  const out = [...drawSlabs(model, view), ...walls, ...patches, ...drawOpenings(model, view, structure)];
  for (const d of Object.values(model.dimensions)) {
    if (!isDimensionVisible(model, view, d)) continue;
    const g = resolveGraphics(model.display, view, dimensionFacts(d)).effect;
    out.push(...drawDimension(model, d, view.scale, model.display.paperSizes, g));
  }
  out.push(...drawTags(model, view));
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
