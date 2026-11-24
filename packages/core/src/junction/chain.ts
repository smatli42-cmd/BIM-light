// Skládání dílčích hran do lomených čar a uzavřených obrysů (sjednocení kousků vrstev, čáry kresby).
import { cross, sub, type Vec2 } from '../geometry/index.ts';
import type { EdgeSet, SubEdge } from './edges.ts';

export interface Run {
  readonly points: readonly Vec2[];
  readonly closed: boolean;
  /** Index první hrany běhu v předaném seznamu (kvůli zdroji čáry). */
  readonly first: number;
}

/** Vynechá body, které leží v přímce se sousedy (zbytky po dělení hran). */
export function simplify(pts: readonly Vec2[], closed: boolean): Vec2[] {
  const out = [...pts];
  let changed = true;
  while (changed && out.length > (closed ? 3 : 2)) {
    changed = false;
    for (let i = closed ? 0 : 1; i < (closed ? out.length : out.length - 1); i++) {
      const a = out[(i + out.length - 1) % out.length] as Vec2;
      const b = out[i] as Vec2;
      const c = out[(i + 1) % out.length] as Vec2;
      if (Math.abs(cross(sub(b, a), sub(c, b))) < 1e-6 * Math.max(1, Math.hypot(c.x - a.x, c.y - a.y))) {
        out.splice(i, 1);
        changed = true;
        break;
      }
    }
  }
  return out;
}

/** Složí orientované hrany do běhů: uzavřené smyčky a otevřené lomené čáry. */
export function chain(set: EdgeSet, picked: readonly SubEdge[]): Run[] {
  const from = new Map<number, number[]>();
  const indeg = new Map<number, number>();
  picked.forEach((e, i) => {
    from.set(e.ia, [...(from.get(e.ia) ?? []), i]);
    indeg.set(e.ib, (indeg.get(e.ib) ?? 0) + 1);
  });
  const used = new Set<number>();
  const runs: Run[] = [];
  const walk = (first: number) => {
    const ids = [(picked[first] as SubEdge).ia];
    let cur: number | undefined = first;
    while (cur !== undefined && !used.has(cur)) {
      used.add(cur);
      const e = picked[cur] as SubEdge;
      ids.push(e.ib);
      cur = (from.get(e.ib) ?? []).find((j) => !used.has(j));
    }
    const closed = ids.length > 3 && ids[0] === ids[ids.length - 1];
    const pts = (closed ? ids.slice(0, -1) : ids).map((i) => set.points[i] as Vec2);
    runs.push({ points: simplify(pts, closed), closed, first });
  };
  // Nejdřív otevřené čáry (začínají v bodě bez příchozí hrany), pak smyčky.
  picked.forEach((e, i) => {
    if (!used.has(i) && !indeg.get(e.ia)) walk(i);
  });
  picked.forEach((_, i) => {
    if (!used.has(i)) walk(i);
  });
  return runs;
}

/** Sjednocení mnohoúhelníků jedné skupiny: hrany bez protějšku složené do obrysů. */
export function unionLoops(set: EdgeSet, nb: readonly number[]): Vec2[][] {
  const boundary = set.edges.filter((_, i) => (nb[i] ?? -1) < 0);
  return chain(set, boundary)
    .filter((r) => r.closed && r.points.length >= 3)
    .map((r) => [...r.points]);
}
