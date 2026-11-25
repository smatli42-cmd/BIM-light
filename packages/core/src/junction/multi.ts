// Stěny v přímce (dva konce ~180°) a uzel se třemi a více konci.
// V přímce: všechny vrstvy kolmo v uzlu. Tři a více: dva konce v přímce tvoří „hostitele“ a ostatní se
// na ně napojí jako T; bez dvojice v přímce pokos ke středu uzlu (tvar Y).
import { add, angleOf, cross, dot, leftNormal, mul, sub, type Vec2 } from '../geometry/index.ts';
import { meet } from './curve.ts';
import { armKey, curveAt, outSides, reachOf, type Arm } from './frame.ts';
import { halfPlane, type HalfPlane } from './half-plane.ts';
import { teeTravel } from './tee.ts';
import { sameCut, type EndResult, type Gap, type NodeResult } from './types.ts';

/** Odchylka od přímky, pod kterou jsou dva konce „v přímce“ (sin 2°). */
const COLLINEAR = Math.sin((2 * Math.PI) / 180);

export const isCollinear = (a: Arm, b: Arm): boolean =>
  Math.abs(cross(a.out, b.out)) < COLLINEAR && dot(a.out, b.out) < 0;

/** Kolmý řez v uzlu (společná čára pro oba konce). */
function square(node: Vec2, dir: Vec2, arm: Arm, join: EndResult['join'], reach: number): EndResult {
  return { join, layers: sameCut([halfPlane(node, leftNormal(dir), arm.out)], reach, arm.layers.length) };
}

export function solveStraight(a: Arm, b: Arm): NodeResult {
  const reach = reachOf([a, b]);
  return {
    ends: new Map([
      [armKey(a.wall.id, a.end), square(a.origin, a.out, a, 'straight', reach)],
      [armKey(b.wall.id, b.end), square(a.origin, a.out, b, 'straight', reach)],
    ]),
    gaps: new Map(),
  };
}

const corePrio = (a: Arm) => Math.max(0, ...a.layers.filter((l) => l.core).map((l) => l.prio));

/** Dvojice v přímce, která bude hostitelem: vyšší priorita jádra, pak menší id. */
function hostPair(arms: readonly Arm[]): [Arm, Arm] | null {
  const found: [Arm, Arm][] = [];
  arms.forEach((a, i) => arms.slice(i + 1).forEach((b) => isCollinear(a, b) && found.push([a, b])));
  const score = (p: [Arm, Arm]) => Math.max(corePrio(p[0]), corePrio(p[1]));
  const id = (p: [Arm, Arm]) => [p[0].wall.id, p[1].wall.id].sort()[0] ?? '';
  found.sort((p, q) => score(q) - score(p) || id(p).localeCompare(id(q)));
  return found[0] ?? null;
}

function solveWithHost(arms: readonly Arm[], [p, q]: [Arm, Arm], reach: number): NodeResult {
  const ends = new Map<string, EndResult>();
  const gaps = new Map<string, Gap[]>([
    [p.wall.id, []],
    [q.wall.id, []],
  ]);
  ends.set(armKey(p.wall.id, p.end), square(p.origin, p.out, p, 'multiple', reach));
  ends.set(armKey(q.wall.id, q.end), square(p.origin, p.out, q, 'multiple', reach));
  for (const j of arms) {
    if (j === p || j === q) continue;
    const t = teeTravel(j, p);
    ends.set(armKey(j.wall.id, j.end), { ...t.end, join: 'multiple' });
    gaps.get(p.wall.id)?.push(...t.gaps);
    gaps.get(q.wall.id)?.push(...teeTravel(j, q).gaps);
  }
  return { ends, gaps };
}

/** Tvar Y: každý konec ořízne dvojice přímek ze středu uzlu k průsečíkům líců sousedů. */
function solveY(arms: readonly Arm[], reach: number): NodeResult {
  const sorted = [...arms].sort((a, b) => angleOf(a.out) - angleOf(b.out));
  const n = sorted.length;
  const qs = sorted.map((a, i) => {
    const next = sorted[(i + 1) % n] as Arm;
    const l = curveAt(a, outSides(a, a).left);
    const r = curveAt(next, outSides(next, next).right);
    return meet(l, r, a.origin);
  });
  const valid = qs.filter((q): q is Vec2 => q !== null);
  const c = mul(
    valid.reduce((s, q) => add(s, q), { x: 0, y: 0 }),
    1 / Math.max(1, valid.length),
  );
  const ends = new Map<string, EndResult>();
  sorted.forEach((a, i) => {
    const cuts: HalfPlane[] = [qs[i], qs[(i + n - 1) % n]]
      .filter((q): q is Vec2 => !!q && Math.hypot(q.x - c.x, q.y - c.y) > 1e-6)
      .map((q) => halfPlane(c, sub(q, c), a.out));
    ends.set(armKey(a.wall.id, a.end), { join: 'multiple', layers: sameCut(cuts, reach, a.layers.length) });
  });
  return { ends, gaps: new Map() };
}

export function solveMulti(arms: readonly Arm[]): NodeResult {
  const reach = reachOf(arms);
  const host = hostPair(arms);
  return host ? solveWithHost(arms, host, reach) : solveY(arms, reach);
}
