// Příkaz: Rozdělit rovnoměrně / EQ (pravidla-interakce, kóty 8). Mezilehlé stěny řady se posunou
// tak, aby všechny úseky byly stejně dlouhé; krajní stěny stojí. Jednorázová akce, ne vazba.
import { dot, leftNormal, tangentAt, type Vec2 } from '../../geometry/index.ts';
import type { Id } from '../../ids/index.ts';
import type { Model } from '../../model/types.ts';
import { dimensionLine } from '../../dimension/align.ts';
import { facePath } from '../../dimension/measure.ts';
import type { LinearDimension } from '../../dimension/types.ts';
import { dimensionOf, wallOf } from '../lookup.ts';
import { S } from '../schema.ts';
import { defineCommand, fail } from '../types.ts';
import { offsetWall } from '../wall/move.ts';

interface Span {
  readonly lo: number;
  readonly hi: number;
  readonly loWall: Id;
  readonly hiWall: Id;
}

function spanOf(model: Model, d: LinearDimension, m: Vec2): Span {
  const [a, b] = d.refs.map((r) => dot(facePath(model, r).start, m)) as [number, number];
  return a <= b
    ? { lo: a, hi: b, loWall: d.refs[0].wallId, hiWall: d.refs[1].wallId }
    : { lo: b, hi: a, loWall: d.refs[1].wallId, hiWall: d.refs[0].wallId };
}

/** Řada kót ve skupině zarovnání seřazená podél směru měření. */
function chainOf(model: Model, id: Id): { spans: Span[]; m: Vec2 } {
  const d = dimensionOf(model, id);
  const members = Object.values(model.dimensions).filter(
    (x): x is LinearDimension =>
      x.kind === 'linear' && (x.id === id || (d.alignGroupId !== null && x.alignGroupId === d.alignGroupId)),
  );
  const first = members[0];
  const line = first && dimensionLine(model, first);
  if (members.length < 2 || !line) fail('invalid', 'Rovnoměrně lze dělit aspoň dvě navazující kóty v řadě');
  const spans = members.map((x) => spanOf(model, x, line.dir)).sort((a, b) => a.lo - b.lo);
  for (let i = 0; i < spans.length - 1; i++) {
    const s = spans[i] as Span;
    const n = spans[i + 1] as Span;
    if (s.hiWall !== n.loWall || n.lo < s.hi - 1) fail('invalid', 'Kóty na sebe nenavazují');
  }
  return { spans, m: line.dir };
}

export const dimensionEqualize = defineCommand<{ dimensionId: Id }>({
  name: 'dimension.equalize',
  label: 'Rozdělit rovnoměrně',
  description:
    'Posune mezilehlé stěny řady kót (skupina zarovnání) tak, aby všechny úseky byly stejně dlouhé. ' +
    'Krajní stěny stojí.',
  group: 'Kóta',
  params: S.object({ dimensionId: S.id }, ['dimensionId']),
  run(model, p) {
    const { spans, m } = chainOf(model, p.dimensionId);
    const n = spans.length;
    const gaps = spans.slice(0, -1).map((s, i) => (spans[i + 1] as Span).lo - s.hi);
    const total = (spans[n - 1] as Span).hi - (spans[0] as Span).lo - gaps.reduce((a, b) => a + b, 0);
    const target = total / n;
    let out = model;
    let gapSum = 0;
    for (let i = 0; i < n - 1; i++) {
      const s = spans[i] as Span;
      const shift = (spans[0] as Span).lo + (i + 1) * target + gapSum - s.hi;
      gapSum += gaps[i] ?? 0;
      if (Math.abs(shift) < 0.01) continue;
      const w = wallOf(out, s.hiWall);
      out = offsetWall(out, w.id, shift * dot(m, leftNormal(tangentAt(w.path, 'start'))));
    }
    return { model: out };
  },
});
