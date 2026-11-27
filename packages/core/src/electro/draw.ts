// Kresba elektro prvku v půdorysu (koncepce 3, základy 5, 11, 29): značka v pevné velikosti na papíře,
// kolmo k líci stěny, posunutá a natočená podle instance; popisek označení a výšky (výška jen když se
// liší od výchozí výšky typu). Hrubá podrobnost bez popisků, posunutá značka má odkazovou čáru.
import type { Primitive } from '../drawing/primitives.ts';
import { add, mul, type Vec2 } from '../geometry/index.ts';
import type { Model } from '../model/types.ts';
import type { Detail, PaperSizes, ResolvedEffect } from '../style/types.ts';
import { drawShapes, type ShapeContext } from './draw-shapes.ts';
import { electroFrame, electroHeight, heightDiffers, symbolFrame, type ElectroFrame } from './place.ts';
import { shapesExtent, symbolShapes } from './symbol.ts';
import { DEFAULT_ELECTRO_TEXT, DEFAULT_SYMBOL_SIZE, type ElectroElement } from './types.ts';

/** Co se kreslí: měřítko, podrobnost a popisky ze stylu. */
export interface ElectroDrawOptions {
  readonly scale: number;
  readonly detail: Detail;
  readonly paper: PaperSizes;
  readonly marks: boolean;
  readonly heights: boolean;
  /** Grafika slotu jiné skupiny než typ (datová a anténní zásuvka v rámečku); chybí = grafika prvku. */
  readonly slotEffect?: (glyph: string) => ResolvedEffect | undefined;
}

/** Popisek výšky: „+1150“ (mm nad podlahou), „−300“ pod podlahou. */
export const heightLabel = (h: number): string => (h < 0 ? `−${Math.abs(h)}` : `+${h}`);

/** Řádky popisku prvku (označení, výška při odlišné výšce). */
export function labelLines(m: Model, el: ElectroElement, o: Pick<ElectroDrawOptions, 'marks' | 'heights'>) {
  const lines: string[] = [];
  if (o.marks && el.mark) lines.push(el.mark);
  const h = electroHeight(m, el);
  if (o.heights && h !== null && heightDiffers(m, el)) lines.push(heightLabel(h));
  return lines;
}

/** Odhad šířky textu (mm na papíře) – stejný poměr jako razítko místnosti. */
const textWidth = (t: string, h: number) => t.length * h * 0.62;

function labels(
  lines: string[],
  f: ElectroFrame,
  ext: ReturnType<typeof shapesExtent>,
  c: ShapeContext,
  o: ElectroDrawOptions,
  wall: boolean,
): Primitive[] {
  const th = o.paper.electroText ?? DEFAULT_ELECTRO_TEXT;
  const lh = th * 1.3 * o.scale;
  const bw = Math.max(...lines.map((t) => textWidth(t, th))) * o.scale;
  const bh = lines.length * lh;
  const gap = th * 0.4 * o.scale;
  let center: Vec2;
  if (wall) {
    const n = f.ey;
    const reach = ext.y1 * c.unit + gap + (Math.abs(n.x) * bw) / 2 + (Math.abs(n.y) * bh) / 2;
    center = add(add(f.origin, mul(f.ex, ((ext.x0 + ext.x1) / 2) * c.unit)), mul(n, reach));
  } else {
    const r = Math.max(Math.abs(ext.x0), Math.abs(ext.x1), Math.abs(ext.y0), Math.abs(ext.y1)) * c.unit;
    center = add(f.origin, { x: r + gap + bw / 2, y: 0 });
  }
  return lines.map((text, i): Primitive => ({
    kind: 'text',
    at: { x: center.x, y: center.y + ((lines.length - 1) / 2 - i) * lh },
    text,
    heightMm: th,
    angle: 0,
    color: c.g.lineColor,
    source: { ...c.source, role: 'popisek elektro' },
  }));
}

/** Primitiva jednoho prvku; prázdné, když hostitel nebo typ chybí. */
export function drawElectroElement(
  m: Model,
  el: ElectroElement,
  g: ResolvedEffect,
  o: ElectroDrawOptions,
): Primitive[] {
  const base = electroFrame(m, el);
  if (!base || !g.visible) return [];
  const sizeMm = el.symbol?.size ?? o.paper.electroSymbol ?? DEFAULT_SYMBOL_SIZE;
  const unit = sizeMm * o.scale;
  const f = symbolFrame(base, el, o.scale);
  const c: ShapeContext = { frame: f, unit, sizeMm, g, source: { elementId: el.id, role: 'značka elektro' } };
  const placed = symbolShapes(m, el, unit, o.detail);
  const out = placed.flatMap((p) => {
    const sg = p.glyph && o.slotEffect?.(p.glyph);
    return drawShapes(p.shapes, p.dx, sg ? { ...c, g: sg } : c);
  });
  if (o.detail === 'coarse') return out;
  const shifted = Math.hypot(f.origin.x - base.origin.x, f.origin.y - base.origin.y) > 1e-6;
  if (shifted)
    out.push({
      kind: 'line',
      points: [base.origin, f.origin],
      closed: false,
      stroke: { pen: g.layerPen, color: g.lineColor, lineType: g.lineType },
      source: { elementId: el.id, role: 'odkazová čára elektro' },
    });
  const lines = labelLines(m, el, o);
  if (lines.length) out.push(...labels(lines, f, shapesExtent(placed), c, o, el.host.kind === 'wall'));
  return out;
}
