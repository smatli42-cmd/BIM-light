// Kresba popisu skladby (ČSN 01 3420 odkazový popis, Archicad Composite label): plná tečka na řezané
// konstrukci, odkazová čára k poličce, pod poličkou řádky vrstev zarovnané k jejímu začátku (text vpravo
// od bodu = zleva, vlevo = zprava). Pero a barva z funkce grafiky (kategorie popisů), písmo v mm na papíře
// (výška popisu, řádkování jako razítko místnosti; základ 29). Viditelnost podle skupiny anotací (základ 28).
import type { Primitive, PrimitiveSource, Stroke } from '../drawing/primitives.ts';
import type { Vec2 } from '../geometry/index.ts';
import { circle, textWidth } from '../level-dim/terrain.ts';
import type { Model } from '../model/types.ts';
import { annotationFacts } from '../section/facts.ts';
import type { Section } from '../section/types.ts';
import { resolveGraphics } from '../style/graphics.ts';
import type { PaperSizes, ResolvedEffect } from '../style/types.ts';
import { layerState } from '../view/effective.ts';
import { tagLayout, type TagLayout } from './content.ts';
import type { CompositionTag } from './types.ts';

/** Rozměry popisu v mm modelu: výška písma, řádek, poloměr tečky. */
function metrics(sizes: PaperSizes, scale: number) {
  const th = sizes.labelText * scale;
  return { th, lh: th * sizes.roomLineSpacing, dot: th * 0.25, gap: th * 0.3 };
}

/** Obdélník textu popisu (pro výběr a tažení): x0, x1, y0, y1 v mm modelu. */
export function tagTextBox(l: TagLayout, sizes: PaperSizes, scale: number) {
  const { th, lh, gap } = metrics(sizes, scale);
  const w = Math.max(...l.lines.map((t) => textWidth(t, th)), th) + gap;
  const dir = l.textAt.x >= l.anchor.x ? 1 : -1;
  const x = [l.textAt.x, l.textAt.x + dir * w];
  return {
    x0: Math.min(...x),
    x1: Math.max(...x),
    y0: l.textAt.y - lh * l.lines.length,
    y1: l.textAt.y,
    dir,
  };
}

export function drawCompositionTag(
  tag: CompositionTag,
  l: TagLayout,
  sizes: PaperSizes,
  scale: number,
  g: ResolvedEffect,
): Primitive[] {
  const { th, lh, dot, gap } = metrics(sizes, scale);
  const stroke: Stroke = { pen: g.projectionPen, color: g.lineColor, lineType: 'solid' };
  const source = (role: string): PrimitiveSource => ({ dimensionId: tag.id, role });
  const box = tagTextBox(l, sizes, scale);
  const shelfEnd: Vec2 = { x: box.dir > 0 ? box.x1 : box.x0, y: l.textAt.y };
  const out: Primitive[] = [
    {
      kind: 'fill',
      polygon: circle(l.anchor, dot, 0, 2 * Math.PI),
      color: g.lineColor,
      transparency: 0,
      source: source('tečka popisu'),
    },
    {
      kind: 'line',
      points: [l.anchor, l.textAt, shelfEnd],
      closed: false,
      stroke,
      source: source('odkazová čára'),
    },
  ];
  l.lines.forEach((text, i) => {
    const w = textWidth(text, th);
    out.push({
      kind: 'text',
      at: { x: l.textAt.x + box.dir * (gap + w / 2), y: l.textAt.y - lh * (i + 0.5) },
      text,
      heightMm: sizes.labelText,
      angle: 0,
      color: g.lineColor,
      source: source(i === 0 && tag.title ? 'název skladby' : 'vrstva skladby'),
    });
  });
  return out;
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
