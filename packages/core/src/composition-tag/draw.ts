// Kresba popisu skladby (česká výkresová praxe, ČSN 01 3420): odkazová čára protne konstrukci kolmo a vede
// přes zadané body ke kolečku s číslem konstrukce; pod kolečkem pokračuje svisle a z ní vybíhají krátké
// vodorovné čárky k řádkům vrstev (vpravo nebo vlevo). Pero a barva z funkce grafiky (kategorie popisů),
// písmo = výška popisu, řádkování jako razítko místnosti (základ 29); viditelnost podle skupiny anotací (28).
import type { Primitive, PrimitiveSource, Stroke } from '../drawing/primitives.ts';
import { vec, type Vec2 } from '../geometry/index.ts';
import { circle, textWidth } from '../level-dim/terrain.ts';
import type { Model } from '../model/types.ts';
import { annotationFacts } from '../section/facts.ts';
import type { Section } from '../section/types.ts';
import { resolveGraphics } from '../style/graphics.ts';
import type { PaperSizes, ResolvedEffect } from '../style/types.ts';
import { layerState } from '../view/effective.ts';
import { tagLayout, type TagLayout } from './content.ts';
import type { CompositionTag, CompositionTagSide } from './types.ts';

/** Rozměry popisu v mm modelu: výška písma, řádek, poloměr kolečka, čárka k řádku, mezera. */
function metrics(sizes: PaperSizes, scale: number) {
  const th = sizes.labelText * scale;
  return { th, lh: th * sizes.roomLineSpacing, r: th * 0.95, tick: th * 0.9, gap: th * 0.3 };
}

/** Kde začínají řádky (pod kolečkem) a výška prvního řádku. */
function rowsTop(l: TagLayout, r: number) {
  return l.end.y - (l.mark !== null ? r : 0);
}

/** Obdélník kolečka a řádků (pro výběr a tažení): x0, x1, y0, y1 v mm modelu. */
export function tagTextBox(l: TagLayout, side: CompositionTagSide, sizes: PaperSizes, scale: number) {
  const { th, lh, r, tick, gap } = metrics(sizes, scale);
  const dir = side === 'right' ? 1 : -1;
  const w = Math.max(0, ...l.lines.map((t) => textWidth(t, th))) + tick + gap;
  const x = [l.end.x - r, l.end.x + r, l.end.x + dir * w];
  return {
    x0: Math.min(...x),
    x1: Math.max(...x),
    y0: rowsTop(l, r) - lh * l.lines.length,
    y1: l.end.y + (l.mark !== null ? r : 0),
  };
}

/** Čára bez kusu uvnitř kolečka (končí na jeho obvodu). */
function trimToCircle(path: readonly Vec2[], r: number): Vec2[] {
  const pts = [...path];
  const end = pts[pts.length - 1];
  const prev = pts[pts.length - 2];
  if (!end || !prev) return pts;
  const len = Math.hypot(end.x - prev.x, end.y - prev.y);
  if (len <= r) return pts.slice(0, -1);
  const k = (len - r) / len;
  pts[pts.length - 1] = { x: prev.x + (end.x - prev.x) * k, y: prev.y + (end.y - prev.y) * k };
  return pts;
}

interface Painter {
  readonly line: (points: Vec2[], role: string, closed?: boolean) => Primitive;
  readonly text: (at: Vec2, t: string, role: string) => Primitive;
}

function painter(tag: CompositionTag, sizes: PaperSizes, g: ResolvedEffect): Painter {
  const stroke: Stroke = { pen: g.projectionPen, color: g.lineColor, lineType: 'solid' };
  const source = (role: string): PrimitiveSource => ({ dimensionId: tag.id, role });
  return {
    line: (points, role, closed = false) => ({ kind: 'line', points, closed, stroke, source: source(role) }),
    text: (at, t, role) => ({
      kind: 'text',
      at,
      text: t,
      heightMm: sizes.labelText,
      angle: 0,
      color: g.lineColor,
      source: source(role),
    }),
  };
}

/** Svislá čára pod kolečkem a řádky vrstev, každý s čárkou od ní. */
function drawRows(tag: CompositionTag, l: TagLayout, k: ReturnType<typeof metrics>, p: Painter): Primitive[] {
  const dir = tag.side === 'right' ? 1 : -1;
  const x = l.end.x;
  const top = rowsTop(l, k.r);
  const ys = l.lines.map((_, i) => top - k.lh * (i + 0.5));
  const last = ys[ys.length - 1];
  const out: Primitive[] =
    last === undefined ? [] : [p.line([vec(x, top), vec(x, last)], 'svislá čára popisu')];
  l.lines.forEach((t, i) => {
    const y = ys[i] as number;
    out.push(p.line([vec(x, y), vec(x + dir * k.tick, y)], 'čárka řádku'));
    const at = vec(x + dir * (k.tick + k.gap + textWidth(t, k.th) / 2), y);
    out.push(p.text(at, t, i === 0 && tag.title ? 'název skladby' : 'vrstva skladby'));
  });
  return out;
}

export function drawCompositionTag(
  tag: CompositionTag,
  l: TagLayout,
  sizes: PaperSizes,
  scale: number,
  g: ResolvedEffect,
): Primitive[] {
  const k = metrics(sizes, scale);
  const p = painter(tag, sizes, g);
  const hasMark = l.mark !== null;
  const out: Primitive[] = [p.line(hasMark ? trimToCircle(l.path, k.r) : [...l.path], 'odkazová čára')];
  if (hasMark) {
    out.push(p.line(circle(l.end, k.r, 0, 2 * Math.PI), 'kolečko popisu', true));
    out.push(p.text(l.end, l.mark as string, 'číslo konstrukce'));
  }
  return [...out, ...drawRows(tag, l, k, p)];
}

/** Popisy skladby v řezu (skupina anotací, funkce grafiky kategorie popisů). */
export function drawCompositionTags(model: Model, s: Section): Primitive[] {
  return Object.values(model.compositionTags ?? {}).flatMap((tag) => {
    if (tag.sectionId !== s.id || !layerState(model.display, s, tag.annotationLayerId).visible) return [];
    const l = tagLayout(model, s, tag);
    const g = resolveGraphics(model.display, s, annotationFacts(tag.id, 'label')).effect;
    return l && g.visible ? drawCompositionTag(tag, l, model.display.paperSizes, s.scale, g) : [];
  });
}
