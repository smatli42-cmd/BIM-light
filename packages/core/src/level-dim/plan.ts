// Výšková kóta v půdorysu (české zvyklosti, vzor Arditu): značka **rámeček** = výška horního líce podlahy /
// desky v bodě (relativně k ±0,000) v obdélníku tenkou čarou, bez praporku – asociativní k desce (jinak
// k úrovni podlaží). Značka **kroužek** = kóta terénu u nároží (RT / UT, terrain.ts) navázaná na roh stěny.
// Anotace podlaží se skupinou anotací a zámkem (základ 28); pero a barva z grafiky kategorie kót.
import type { Primitive } from '../drawing/primitives.ts';
import type { Vec2 } from '../geometry/index.ts';
import type { Id } from '../ids/index.ts';
import type { Model } from '../model/types.ts';
import { slabLevels } from '../slab/geometry.ts';
import { pointInSlab } from '../slab/pick.ts';
import { allSlabs } from '../slab/queries.ts';
import type { PaperSizes, ResolvedEffect, Style } from '../style/types.ts';
import { levelMarkSize, levelTextSize } from './symbol.ts';
import { annotationFacts } from '../section/facts.ts';
import { resolveGraphics } from '../style/graphics.ts';
import { layerState, styleOfView } from '../view/effective.ts';
import type { LevelRef } from './types.ts';
import { absoluteText, elevationText, levelZ } from './value.ts';
import {
  cornerPoint,
  drawTerrainMark,
  painter,
  terrainLines,
  textWidth,
  type CornerAnchor,
  type Painter,
} from './terrain.ts';

/** Značka v půdorysu: rámeček (výška podlahy), nebo kroužek (kóta terénu RT / UT u nároží). */
export type PlanLevelMarker = 'box' | 'circle';
export const PLAN_LEVEL_MARKERS: readonly PlanLevelMarker[] = ['box', 'circle'];

export interface PlanLevelDimension {
  readonly id: Id;
  readonly storeyId: Id;
  readonly ref: LevelRef;
  /** Kótovaný bod v půdorysu (mm). */
  readonly point: Vec2;
  /** Střed textu (rámeček), u kroužku začátek poličky. */
  readonly textAt: Vec2;
  readonly marker: PlanLevelMarker;
  readonly absolute: boolean;
  /** Kóta terénu: rostlý a upravený terén (mm k ±0,000) zadané číslem, dokud není terén v modelu. */
  readonly rt?: number | null;
  readonly ut?: number | null;
  /** Kóta terénu navázaná na roh stěny (posune se s ním); chybí = pevný bod. */
  readonly anchor?: CornerAnchor | null;
  readonly annotationLayerId: Id;
  readonly locked: boolean;
}

/** Na co kóta v bodě ukazuje: horní líc nejvyšší desky podlaží pod bodem, jinak úroveň podlaží. */
export function planLevelRef(model: Model, storeyId: Id, p: Vec2): LevelRef {
  const top = allSlabs(model)
    .filter((s) => s.storeyId === storeyId && s.variant.kind === 'main' && pointInSlab(s, p))
    .sort((a, b) => slabLevels(model, b).top - slabLevels(model, a).top)[0];
  return top ? { kind: 'edge', elementId: top.id, edge: 'top' } : { kind: 'storey', storeyId };
}

/** Kótovaný bod: roh stěny, na který je kóta navázaná, jinak uložený bod. */
export const planLevelPoint = (model: Model, d: PlanLevelDimension): Vec2 =>
  (d.anchor && cornerPoint(model, d.anchor)) || d.point;

/** Řádky textu kóty (rámeček: jedna hodnota; kroužek: RT / UT podle stylu); null = odkaz neplatí. */
export function planLevelTexts(model: Model, d: PlanLevelDimension, style?: Style): string[] | null {
  if (d.marker === 'circle')
    return terrainLines(model, style, { rt: d.rt ?? null, ut: d.ut ?? null, absolute: d.absolute });
  const z = levelZ(model, d.ref);
  if (z === null) return null;
  return [d.absolute ? absoluteText(model, z) : elevationText(z)];
}

/** Rámeček kolem hodnoty (tenká čára). */
function boxMark(at: Vec2, text: string, th: number, p: Painter): Primitive[] {
  const w = textWidth(text, th) / 2 + th * 0.4;
  const h = th * 0.9;
  const box = [
    { x: at.x - w, y: at.y - h },
    { x: at.x + w, y: at.y - h },
    { x: at.x + w, y: at.y + h },
    { x: at.x - w, y: at.y + h },
  ];
  return [p.line(box, true), p.text(at, text)];
}

/** Kresba kóty; `point` = kótovaný bod z modelu (u rohu stěny se s ním posune i hodnota). */
export function drawPlanLevel(
  d: PlanLevelDimension,
  lines: readonly string[],
  point: Vec2,
  sizes: PaperSizes,
  scale: number,
  g: ResolvedEffect,
): Primitive[] {
  const th = levelTextSize(sizes) * scale;
  const p = painter(d.id, g, levelTextSize(sizes));
  const shift = { x: point.x - d.point.x, y: point.y - d.point.y };
  const textAt = { x: d.textAt.x + shift.x, y: d.textAt.y + shift.y };
  if (d.marker === 'box') return boxMark(textAt, lines[0] ?? '', th, p);
  const r = (levelMarkSize(sizes) / 2) * scale;
  return drawTerrainMark({ point, textAt, lines }, r, th, p);
}

/** Výškové kóty podlaží pohledu (půdorys): skupina anotací, funkce grafiky (kategorie kót). */
export function drawPlanLevels(
  model: Model,
  view: { storeyId: Id; scale: number } & Parameters<typeof resolveGraphics>[1],
): Primitive[] {
  return Object.values(model.planLevelDims ?? {}).flatMap((d) => {
    if (d.storeyId !== view.storeyId || !layerState(model.display, view, d.annotationLayerId).visible)
      return [];
    const lines = planLevelTexts(model, d, styleOfView(model.display, view));
    const g = resolveGraphics(model.display, view, annotationFacts(d.id, 'dimension')).effect;
    if (!lines || !g.visible) return [];
    return drawPlanLevel(d, lines, planLevelPoint(model, d), model.display.paperSizes, view.scale, g);
  });
}
