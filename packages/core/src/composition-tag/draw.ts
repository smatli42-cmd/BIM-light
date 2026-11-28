// Kresba popisu skladby (česká výkresová praxe, ČSN 01 3420; pokyn uživatele 2026-11-28): popiska má vždy
// stejný tvar – nahoře kolečko s číslem konstrukce, z něj svislá čára dolů a z ní vodorovné čárky k řádkům
// vrstev (vpravo nebo vlevo); odkazová čára vychází vždy dole ze svislé čáry a přes zadané body protne
// konstrukci kolmo. Řádky zarovnané vlevo / na střed / vpravo kotvou textu (písmo měří až vykreslení, jádro
// šířku jen odhaduje). Pero a barva z funkce grafiky (kategorie popisů), písmo = výška popisu, řádkování
// jako razítko místnosti (základ 29); viditelnost podle skupiny anotací (základ 28).
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
import type { CompositionTag, CompositionTagOptions } from './types.ts';

/** Rozměry popisu v mm modelu: výška písma, řádek, poloměr kolečka, čárka k řádku, mezera. */
function metrics(sizes: PaperSizes, scale: number) {
  const th = sizes.labelText * scale;
  return { th, lh: th * sizes.roomLineSpacing, r: th * 0.95, tick: th * 0.9, gap: th * 0.3 };
}
type Metrics = ReturnType<typeof metrics>;

/** Hlava popisky nad koncem čáry: výšky řádků (shora dolů), horní konec svislé čáry, střed kolečka. */
function head(l: TagLayout, k: Metrics) {
  const n = l.lines.length;
  const top = l.end.y + k.lh * n;
  return {
    ys: l.lines.map((_, i) => l.end.y + k.lh * (n - i - 0.5)),
    top,
    center: l.mark !== null ? vec(l.end.x, top + k.r) : null,
  };
}

/** Blok řádků: bližší okraj u svislé čáry, odhad šířky (nejdelší řádek), směr (+1 vpravo). */
function block(l: TagLayout, side: CompositionTagOptions['side'], k: Metrics) {
  const dir = side === 'right' ? 1 : -1;
  const near = l.end.x + dir * (k.tick + k.gap);
  const width = Math.max(0, ...l.lines.map((t) => textWidth(t, k.th)));
  return { dir, near, far: near + dir * width, width };
}

/** Obdélník popisky (kolečko, svislá čára, řádky) pro výběr a tažení: x0, x1, y0, y1 v mm modelu. */
export function tagTextBox(
  l: TagLayout,
  side: CompositionTagOptions['side'],
  sizes: PaperSizes,
  scale: number,
) {
  const k = metrics(sizes, scale);
  const h = head(l, k);
  const b = block(l, side, k);
  const x = [l.end.x - k.r, l.end.x + k.r, b.far];
  return { x0: Math.min(...x), x1: Math.max(...x), y0: l.end.y, y1: h.center ? h.center.y + k.r : h.top };
}

interface Painter {
  readonly line: (points: Vec2[], role: string, closed?: boolean) => Primitive;
  readonly text: (at: Vec2, t: string, role: string, align?: 'left' | 'center' | 'right') => Primitive;
}

function painter(id: string, sizes: PaperSizes, g: ResolvedEffect): Painter {
  const stroke: Stroke = { pen: g.projectionPen, color: g.lineColor, lineType: 'solid' };
  const source = (role: string): PrimitiveSource => ({ dimensionId: id, role });
  return {
    line: (points, role, closed = false) => ({ kind: 'line', points, closed, stroke, source: source(role) }),
    text: (at, t, role, align) => ({
      kind: 'text',
      at,
      text: t,
      heightMm: sizes.labelText,
      angle: 0,
      color: g.lineColor,
      source: source(role),
      ...(align ? { align } : {}),
    }),
  };
}

/** Řádky vrstev s čárkami od svislé čáry; kotva textu podle zarovnání (u čáry vždy přesně). */
function drawRows(tag: CompositionTag, l: TagLayout, k: Metrics, p: Painter): Primitive[] {
  const h = head(l, k);
  const b = block(l, tag.side, k);
  const x = l.end.x;
  const left = b.dir > 0 ? b.near : b.far;
  const right = b.dir > 0 ? b.far : b.near;
  const at = tag.align === 'left' ? left : tag.align === 'right' ? right : (left + right) / 2;
  return l.lines.flatMap((t, i) => {
    const y = h.ys[i] as number;
    const w = textWidth(t, k.th);
    // Bližší okraj řádku k čáře (u zarovnání od čáry dál odhad) – čárka k němu dosáhne.
    const edge =
      tag.align === 'center'
        ? at - (b.dir * w) / 2
        : (tag.align === 'left') === b.dir > 0
          ? at
          : at - b.dir * w;
    const end = b.dir * (edge - b.dir * k.gap - x) > k.tick ? edge - b.dir * k.gap : x + b.dir * k.tick;
    return [
      p.line([vec(x, y), vec(end, y)], 'čárka řádku'),
      p.text(vec(at, y), t, i === 0 && tag.title ? 'název skladby' : 'vrstva skladby', tag.align),
    ];
  });
}

export function drawCompositionTag(
  tag: CompositionTag,
  l: TagLayout,
  sizes: PaperSizes,
  scale: number,
  g: ResolvedEffect,
): Primitive[] {
  const k = metrics(sizes, scale);
  const p = painter(tag.id, sizes, g);
  const h = head(l, k);
  // Odkazová čára od konstrukce ke konci a dál svisle nahoru přes řádky ke kolečku.
  const out: Primitive[] = [p.line([...l.path, vec(l.end.x, h.top)], 'odkazová čára')];
  if (h.center) {
    out.push(p.line(circle(h.center, k.r, 0, 2 * Math.PI), 'kolečko popisu', true));
    out.push(p.text(h.center, l.mark as string, 'číslo konstrukce'));
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
