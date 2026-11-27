// Úrovně podlaží v řezu a pohledu (rozhodnutí 19, vzor Arditu, ČSN 01 3420): tenká čárkovaná čára úrovně
// podlaží přes celý výkres a vlevo mimo budovu malý prázdný praporek hrotem na čáře, nad ním drobný text
// „2.NP +3,000“ (název a výška na jednom řádku). Navíc kóta nejvyššího bodu konstrukcí. Velikosti na papíře
// (základ 29: `paperSizes.levelMark`, `levelText`), pero a barva z funkce grafiky (kategorie kót, základ 11).
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

/** Přesah čáry úrovně vlevo za kresbu (mm na papíře): místo pro praporek a text „2.NP +3,000“. */
export const LEVEL_LEFT = 18;
/** Přesah čáry úrovně vpravo za kresbu (mm na papíře). */
export const LEVEL_RIGHT = 4;

const inRange = (z: number, r: SectionRange | null) => !r || (z >= r.bottom - 1e-6 && z <= r.top + 1e-6);

const mark = (i: LevelsInput, x: number, z: number, text: string) =>
  drawLevelSymbol({ x, z, text, below: false, filled: i.filled }, i.sizes, i.scale, i.g, {
    role: 'výšková kóta',
  });

/** Čáry a kóty úrovní všech podlaží v rozsahu výšky řezu. */
export function drawLevels(model: Model, i: LevelsInput): Primitive[] {
  const k = i.scale;
  const x0 = i.u0 - LEVEL_LEFT * k;
  const x1 = i.u1 + LEVEL_RIGHT * k;
  const markX = x0 + (LEVEL_LEFT / 2) * k;
  const line: Stroke = { pen: i.g.projectionPen, color: i.g.lineColor, lineType: 'dashed' };
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
    out.push(...mark(i, markX, z, `${st.name} ${elevationText(z)}`));
  }
  const top = i.top;
  if (top !== null && inRange(top, i.range) && !storeys.some((s) => Math.abs(s.elevation - top) < 1)) {
    const points = [
      { x: markX - levelMarkSize(i.sizes) * LEVEL_ARM * k, y: top },
      { x: i.u0, y: top },
    ];
    const stroke: Stroke = { ...line, lineType: 'solid' };
    out.push({ kind: 'line', points, closed: false, stroke, source: { role: 'úroveň vrcholu' } });
    out.push(...mark(i, markX, top, elevationText(top)));
  }
  return out;
}
