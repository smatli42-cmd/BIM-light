// Úrovně podlaží a výškové kóty v řezu a pohledu (rozhodnutí 19, české zvyklosti): tenká čerchovaná čára
// úrovně podlaží přes celý výkres, vpravo výšková kóta – trojúhelník hrotem na čáře a nad ním výška v metrech
// od ±0,000 se třemi desetinnými místy (±0,000, +3,000, −0,150). Navíc kóta nejvyššího bodu konstrukcí.
// Velikosti jsou na papíře (základ 29), pero a barva z funkce grafiky (kategorie kót, základ 11).
import type { Primitive, Stroke } from '../drawing/primitives.ts';
import type { Model } from '../model/types.ts';
import type { PaperSizes, ResolvedEffect } from '../style/types.ts';
import type { SectionRange } from './types.ts';

/** Výška v metrech podle českých zvyklostí: ±0,000 / +3,000 / −0,150. */
export function elevationText(z: number): string {
  const m = Math.round(z) / 1000;
  const abs = Math.abs(m).toFixed(3).replace('.', ',');
  if (Math.abs(m) < 0.0005) return `±${abs}`;
  return m > 0 ? `+${abs}` : `−${abs}`;
}

export interface LevelsInput {
  /** Šířka kresby (mm modelu) – čáry podlaží ji přesahují. */
  readonly u0: number;
  readonly u1: number;
  /** Nejvyšší bod konstrukcí (kóta navíc), null = žádné prvky. */
  readonly top: number | null;
  readonly range: SectionRange | null;
  readonly scale: number;
  readonly sizes: PaperSizes;
  readonly g: ResolvedEffect;
}

const inRange = (z: number, r: SectionRange | null) => !r || (z >= r.bottom - 1e-6 && z <= r.top + 1e-6);

/** Značka výškové kóty: trojúhelník hrotem dolů v bodě (x, z) a text nad ním. */
export function levelMark(x: number, z: number, text: string, i: LevelsInput, role: string): Primitive[] {
  const k = i.scale;
  const h = i.sizes.labelText * k;
  const stroke: Stroke = { pen: i.g.projectionPen, color: i.g.lineColor, lineType: 'solid' };
  const tri = [
    { x, y: z },
    { x: x - h * 0.6, y: z + h },
    { x: x + h * 0.6, y: z + h },
  ];
  return [
    { kind: 'line', points: tri, closed: true, stroke, source: { role } },
    {
      kind: 'line',
      points: [
        { x: x - h * 0.6, y: z + h },
        { x: x + h * 4, y: z + h },
      ],
      closed: false,
      stroke,
      source: { role },
    },
    {
      kind: 'text',
      at: { x: x + h * 1.8, y: z + h * 1.8 },
      text,
      heightMm: i.sizes.labelText,
      angle: 0,
      color: i.g.lineColor,
      source: { role },
    },
  ];
}

/** Čáry a kóty úrovní všech podlaží v rozsahu výšky řezu. */
export function drawLevels(model: Model, i: LevelsInput): Primitive[] {
  const k = i.scale;
  const over = i.sizes.labelText * 4 * k;
  const x0 = i.u0 - over;
  const x1 = i.u1 + over;
  const markX = x1 + i.sizes.labelText * 2 * k;
  const line: Stroke = { pen: i.g.projectionPen, color: i.g.lineColor, lineType: 'dash-dot' };
  const out: Primitive[] = [];
  const storeys = Object.values(model.storeys).sort((a, b) => a.elevation - b.elevation);
  for (const st of storeys) {
    if (!inRange(st.elevation, i.range)) continue;
    const z = st.elevation;
    out.push({
      kind: 'line',
      points: [
        { x: x0, y: z },
        { x: x1, y: z },
      ],
      closed: false,
      stroke: line,
      source: { role: 'úroveň podlaží' },
    });
    out.push(...levelMark(markX, z, elevationText(z), i, 'výšková kóta'));
    out.push({
      kind: 'text',
      at: { x: x0 + i.sizes.labelText * 2 * k, y: z + i.sizes.labelText * k },
      text: st.name,
      heightMm: i.sizes.labelText,
      angle: 0,
      color: i.g.lineColor,
      source: { role: 'název podlaží' },
    });
  }
  const top = i.top;
  if (top !== null && inRange(top, i.range) && !storeys.some((s) => Math.abs(s.elevation - top) < 1)) {
    const stroke: Stroke = { ...line, lineType: 'solid' };
    out.push({
      kind: 'line',
      points: [
        { x: i.u1, y: top },
        { x: markX, y: top },
      ],
      closed: false,
      stroke,
      source: { role: 'úroveň vrcholu' },
    });
    out.push(...levelMark(markX, top, elevationText(top), i, 'výšková kóta'));
  }
  return out;
}
