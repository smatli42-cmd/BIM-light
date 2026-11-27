// Úrovně podlaží v řezu a pohledu (rozhodnutí 19, české zvyklosti): tenká čerchovaná čára úrovně podlaží přes
// celý výkres s názvem podlaží vlevo a vpravo automatická výšková kóta (praporek podle ČSN 01 3420,
// level-dim/symbol.ts). Navíc kóta nejvyššího bodu konstrukcí. Velikosti na papíře (základ 29), pero a barva
// z funkce grafiky (kategorie kót, základ 11).
import type { Primitive, Stroke } from '../drawing/primitives.ts';
import { drawLevelSymbol, LEVEL_ARM, levelMarkSize } from '../level-dim/symbol.ts';
import { elevationText } from '../level-dim/value.ts';
import type { Model } from '../model/types.ts';
import type { PaperSizes, ResolvedEffect } from '../style/types.ts';
import type { SectionRange } from './types.ts';

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
  /** Styl vyplňuje i relativní kóty (Ardit); ČSN = nevyplněné. */
  readonly filled: boolean;
}

const inRange = (z: number, r: SectionRange | null) => !r || (z >= r.bottom - 1e-6 && z <= r.top + 1e-6);

const mark = (i: LevelsInput, x: number, z: number) =>
  drawLevelSymbol({ x, z, text: elevationText(z), below: false, filled: i.filled }, i.sizes, i.scale, i.g, {
    role: 'výšková kóta',
  });

/** Čáry a kóty úrovní všech podlaží v rozsahu výšky řezu. */
export function drawLevels(model: Model, i: LevelsInput): Primitive[] {
  const k = i.scale;
  const over = i.sizes.labelText * 4 * k;
  const x0 = i.u0 - over;
  const x1 = i.u1 + over;
  const markX = x1 + levelMarkSize(i.sizes) * (LEVEL_ARM + 1) * k;
  const line: Stroke = { pen: i.g.projectionPen, color: i.g.lineColor, lineType: 'dash-dot' };
  const out: Primitive[] = [];
  const storeys = Object.values(model.storeys).sort((a, b) => a.elevation - b.elevation);
  for (const st of storeys) {
    if (!inRange(st.elevation, i.range)) continue;
    const z = st.elevation;
    const points = [
      { x: x0, y: z },
      { x: x1, y: z },
    ];
    out.push({ kind: 'line', points, closed: false, stroke: line, source: { role: 'úroveň podlaží' } });
    out.push(...mark(i, markX, z));
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
    const points = [
      { x: i.u1, y: top },
      { x: markX, y: top },
    ];
    const stroke: Stroke = { ...line, lineType: 'solid' };
    out.push({ kind: 'line', points, closed: false, stroke, source: { role: 'úroveň vrcholu' } });
    out.push(...mark(i, markX, top));
  }
  return out;
}
