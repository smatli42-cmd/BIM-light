// Druh úseku řetězu stěn (koncepce rozhraní, části 2 D a I): úsečka, tečný oblouk (navazuje na předchozí
// úsek), oblouk bodem (bod na oblouku, pak konec). Tvar počítá jádro (arcTangent, arcThrough).
import { arcTangent, arcThrough, dist, tangentAt, type Path, type Vec2 } from '@bim-light/core';
import type { IconName } from '../../ui/icons/paths.ts';

export type Segment = 'line' | 'tangent' | 'arc';

export const SEGMENTS: readonly { id: Segment; icon: IconName; label: string; help: string }[] = [
  { id: 'line', icon: 'seg-line', label: 'Úsečka', help: 'Úsečka' },
  {
    id: 'tangent',
    icon: 'seg-tangent',
    label: 'Tečný oblouk',
    help: 'Tečný oblouk – navazuje na předchozí úsek',
  },
  { id: 'arc', icon: 'seg-arc', label: 'Oblouk bodem', help: 'Oblouk bodem – bod na oblouku, pak konec' },
];

/** Další druh úseku (klávesa M); tečný jen když je na co navázat. */
export function nextSegment(seg: Segment, tangentOk: boolean): Segment {
  const order: Segment[] = tangentOk ? ['line', 'tangent', 'arc'] : ['line', 'arc'];
  return order[(order.indexOf(seg) + 1) % order.length] ?? 'line';
}

/** Tvar úseku z bodu `pt` do `q`; `prevDir` = směr konce předchozího úseku, `through` = bod oblouku. */
export function segmentPath(
  seg: Segment,
  pt: Vec2,
  q: Vec2,
  prevDir: number | null,
  through: Vec2 | null,
): Path {
  if (seg === 'tangent' && prevDir !== null)
    return arcTangent(pt, { x: Math.cos(prevDir), y: Math.sin(prevDir) }, q);
  if (seg === 'arc' && through && dist(through, pt) > 1 && dist(through, q) > 1)
    return arcThrough(pt, through, q);
  return { kind: 'line', start: pt, end: q };
}

/** Směr konce úseku v radiánech (pro tečné navázání a úhlové kroky dalšího úseku). */
export function endDirection(p: Path): number {
  const t = tangentAt(p, 'end');
  return Math.atan2(t.y, t.x);
}
