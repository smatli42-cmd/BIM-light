// Kresba řezu a pohledu z modelu (rozhodnutí 19, základy 4, 5, 11, 29): seznam primitiv v mm výkresu (u, z).
// Řez: konstrukce proříznuté rovinou po vrstvách (výplň a šrafa materiálu, obrys perem řezu, hranice vrstev),
// za rovinou do hloubky pohledu pohledové hrany perem pohledu se zakrytím. Pohled (fasáda): jen pohledové hrany.
// Podrobnost: hrubá = obrys a výplň, střední = vrstvy a šrafy, jemná = navíc hranice nosného jádra.
// Úrovně podlaží a výškové kóty. Barvy, pera, šrafy jen z funkce grafiky a materiálů.
import { difference } from '../covering/polygon.ts';
import type { Drawing, Primitive, Stroke } from '../drawing/primitives.ts';
import type { Id } from '../ids/index.ts';
import type { Model } from '../model/types.ts';
import { scaleHatch } from '../hatch/scale.ts';
import type { Hatch } from '../hatch/types.ts';
import { resolveGraphics } from '../style/graphics.ts';
import type { Detail, ResolvedEffect } from '../style/types.ts';
import { detailOf, styleOfView } from '../view/effective.ts';
import { annotationFacts } from './facts.ts';
import { drawCutLines, type CutLineItem, type CutLinePiece } from '../wall/cut-lines.ts';
import { materialHatch, type DrawLookup } from '../wall/draw-hatch.ts';
import { slabCut, wallCut, type CutPiece } from './cut.ts';
import { effectiveFrame } from './frame.ts';
import { drawLevels } from './levels.ts';
import { drawLevelDims } from '../level-dim/draw.ts';
import { drawSectionDims } from '../section-dim/draw.ts';
import { occluder, visibleParts, type Occluder } from './occlude.ts';
import { ringsOf, simplePieces } from './pieces.ts';
import { slabProjection, wallProjection, type Projected } from './projection.ts';
import { sectionLimits, type Section } from './types.ts';
import type { Element } from '../model/types.ts';
import { elementFacts } from '../style/conditions.ts';
import { sectionElements } from './visible.ts';

interface CutItem {
  readonly elementId: Id;
  readonly g: ResolvedEffect;
  readonly pieces: readonly CutPiece[];
}

interface ProjItem extends Projected {
  readonly g: ResolvedEffect;
}

function lookup(model: Model, s: Section): DrawLookup {
  const k = styleOfView(model.display, s).hatchScale ?? 1;
  const scaled = new Map<string, Hatch | undefined>();
  return {
    material: (id) => model.materials[id],
    hatch: (id) => {
      if (!scaled.has(id)) {
        const h = model.display.hatches[id];
        scaled.set(id, h && scaleHatch(h, k));
      }
      return scaled.get(id);
    },
  };
}

/** Výplně, šrafy a čáry řezaných konstrukcí. */
function drawCut(items: readonly CutItem[], detail: Detail, look: DrawLookup): Primitive[] {
  const out: Primitive[] = [];
  const lineItems: CutLineItem[] = [];
  const linePieces: CutLinePiece[] = [];
  items.forEach((it, item) => {
    lineItems.push({ elementId: it.elementId, g: it.g, hiddenCaps: [] });
    it.pieces.forEach((p, layer) => {
      for (const polygon of p.shapes.flatMap(simplePieces)) {
        linePieces.push({ polygon, item, layer, materialId: p.materialId, core: p.core });
        if (it.g.fillColor !== null)
          out.push({
            kind: 'fill',
            polygon,
            color: it.g.fillColor,
            transparency: it.g.transparency,
            source: { elementId: it.elementId, role: 'výplň řezu' },
          });
        if (detail !== 'coarse')
          out.push(...materialHatch(p.materialId, polygon, it.g, look, it.elementId, p.band));
      }
    });
  });
  return [...out, ...drawCutLines(lineItems, linePieces, detail)];
}

/**
 * Pohledové plochy v barvě povrchu z funkce grafiky (fáze: bourání žlutě, nové červeně – jako ve 3D;
 * hlášení uživatele 2026-11-27: rovnoběžná zbouraná stěna za rovinou jinak nemá vlastní čáru). Plocha se
 * zakryje řezanými a bližšími prvky; bez barvy povrchu (výchozí) se nic nevyplní.
 */
function drawProjectionFills(items: readonly ProjItem[], cut: readonly CutItem[]): Primitive[] {
  const cutRings = cut.flatMap((c) => c.pieces.flatMap((p) => ringsOf(p.shapes)));
  return [...items]
    .sort((a, b) => b.depth - a.depth)
    .flatMap((p) => {
      const color = p.g.surfaceColor;
      if (!color) return [];
      const nearer = items.filter((q) => q !== p && q.depth < p.depth).flatMap((q) => ringsOf(q.shapes));
      return difference(p.shapes, [...cutRings, ...nearer])
        .flatMap(simplePieces)
        .map((polygon): Primitive => ({
          kind: 'fill',
          polygon,
          color,
          transparency: p.g.surfaceTransparency ?? 0,
          source: { elementId: p.elementId, role: 'pohledová plocha' },
        }));
    });
}

/** Pohledové hrany se zakrytím bližšími plochami. */
function drawProjection(items: readonly ProjItem[], cut: readonly CutItem[]): Primitive[] {
  const occ: Occluder[] = [
    ...cut.flatMap((c) => c.pieces.map((p) => occluder(`řez:${c.elementId}`, -1, ringsOf(p.shapes)))),
    ...items.map((p) => occluder(p.elementId, p.depth, ringsOf(p.shapes))),
  ];
  const out: Primitive[] = [];
  for (const p of items) {
    const stroke: Stroke = { pen: p.g.projectionPen, color: p.g.lineColor, lineType: p.g.lineType };
    for (const ring of ringsOf(p.shapes))
      ring.forEach((a, i) => {
        const b = ring[(i + 1) % ring.length] as typeof a;
        for (const [x, y] of visibleParts(a, b, p.elementId, p.depth, occ))
          out.push({
            kind: 'line',
            points: [x, y],
            closed: false,
            stroke,
            source: { elementId: p.elementId, role: 'pohledová hrana' },
          });
      });
  }
  return out;
}

function extent(cut: readonly CutItem[], proj: readonly ProjItem[], length: number) {
  const pts = [
    ...cut.flatMap((c) => c.pieces.flatMap((p) => ringsOf(p.shapes))),
    ...proj.flatMap((p) => ringsOf(p.shapes)),
  ].flat();
  if (!pts.length) return { u0: 0, u1: length, top: null };
  const xs = pts.map((p) => p.x);
  return { u0: Math.min(...xs), u1: Math.max(...xs), top: Math.max(...pts.map((p) => p.y)) };
}

/**
 * Grafika vzdálené oblasti (Archicad „Distant Area“): prvek, jehož nejbližší bod je dál než „vzdálená
 * oblast od“, dostane grafiku vzdálené oblasti z nastavení zobrazení (patro 4, úprava pohledu – přebije
 * styl a pravidla, přepis prvku ji dál může změnit). Vrací null, když prvek do vzdálené oblasti nepatří.
 */
function farGraphics(model: Model, s: Section) {
  const { farClip } = sectionLimits(model.sectionPresets, s);
  const effect = model.display.farArea;
  return (el: Element, depth: number): ResolvedEffect | null => {
    if (farClip === null || !effect || depth < farClip) return null;
    return resolveGraphics(model.display, s, { ...elementFacts(model, el), zoneEffect: effect }).effect;
  };
}

export function drawSection(model: Model, sectionId: Id): Drawing {
  const s = model.sections[sectionId];
  if (!s) throw new Error(`Řez ${sectionId} neexistuje`);
  const f = effectiveFrame(model.sectionPresets, s);
  const els = sectionElements(model, s);
  const m = els.model;
  const cut: CutItem[] = [];
  if (s.kind === 'section') {
    for (const { wall, g } of els.walls)
      cut.push({ elementId: wall.id, g, pieces: wallCut(m, wall, f, s.range) });
    for (const { slab, g } of els.slabs)
      cut.push({ elementId: slab.id, g, pieces: slabCut(m, slab, f, s.range) });
  }
  const far = farGraphics(model, s);
  const proj: ProjItem[] = [
    ...els.walls.map(({ wall, g }) => ({ el: wall, p: wallProjection(m, wall, f, s.range), g })),
    ...els.slabs.map(({ slab, g }) => ({ el: slab, p: slabProjection(m, slab, f, s.range), g })),
  ].flatMap(({ el, p, g }) => (p ? [{ ...p, g: far(el, p.depth) ?? g }] : []));
  const cutItems = cut.filter((c) => c.pieces.length);
  const ext = extent(cutItems, proj, f.length);
  const g = resolveGraphics(model.display, s, annotationFacts(s.id, 'dimension')).effect;
  return {
    scale: s.scale,
    primitives: [
      ...drawProjectionFills(proj, cutItems),
      ...drawProjection(proj, cutItems),
      ...drawCut(cutItems, detailOf(model.display, s), lookup(model, s)),
      ...drawLevels(model, {
        ...ext,
        range: s.range,
        scale: s.scale,
        sizes: model.display.paperSizes,
        g,
        filled: styleOfView(model.display, s).levelMarkFilled === true,
      }),
      ...drawLevelDims(model, s),
      ...drawSectionDims(model, s),
    ],
  };
}
