// Kontroly modelu (plán stěn Z10): překrývající se stěny, nenapojené konce u jiné stěny a příliš krátké
// stěny. Varují, nebrání (jako varování v Revitu / kolize v Archicadu). Čisté funkce nad modelem.
import {
  cross,
  dist,
  dot,
  endPoint,
  mul,
  nearestOnPath,
  norm,
  pathLength,
  sub,
  add,
  leftNormal,
} from '../geometry/index.ts';
import type { Vec2 } from '../geometry/index.ts';
import type { Id } from '../ids/index.ts';
import { endNode } from '../junction/nodes.ts';
import type { Model } from '../model/types.ts';
import { allWalls, wallSection } from '../wall/queries.ts';
import type { Wall } from '../wall/types.ts';

export type CheckKind = 'overlap' | 'unconnected' | 'short';

export interface CheckIssue {
  readonly kind: CheckKind;
  readonly wallIds: readonly Id[];
  /** Místo problému v půdorysu (mm) – kam přiblížit. */
  readonly at: Vec2;
  readonly message: string;
}

export interface CheckOptions {
  readonly storeyId?: Id;
  /** Stěna kratší než tato mez (mm) je podezřelá. */
  readonly minLength?: number;
}

export const DEFAULT_MIN_LENGTH = 100;
/** Konec blíž k referenční čáře druhé stěny než její tloušťka + tato vůle (mm) „chtěl být napojený“. */
const NEAR = 100;

interface Body {
  readonly wall: Wall;
  readonly thickness: number;
  /** Osa stěny (přímá stěna): bod a jednotkový směr; u oblouku null. */
  readonly axis: { readonly p: Vec2; readonly d: Vec2; readonly len: number } | null;
}

function bodyOf(m: Model, w: Wall): Body {
  const s = wallSection(m, w);
  const thickness = s.thickness;
  if (w.path.kind !== 'line') return { wall: w, thickness, axis: null };
  const d = norm(sub(w.path.end, w.path.start));
  // offsety řezu jsou doleva od směru kreslení (strana tloušťky je už ve znaménku)
  const p = add(w.path.start, mul(leftNormal(d), s.faces.axis));
  return { wall: w, thickness, axis: { p, d, len: pathLength(w.path) } };
}

/** Dvě přímé rovnoběžné stěny, jejichž tělesa se překrývají (ne jen dotýkají) aspoň 10 mm. */
function overlap(a: Body, b: Body): Vec2 | null {
  if (!a.axis || !b.axis || Math.abs(cross(a.axis.d, b.axis.d)) > 0.02) return null;
  if (Math.abs(cross(a.axis.d, sub(b.axis.p, a.axis.p))) >= (a.thickness + b.thickness) / 2 - 1) return null;
  const s0 = dot(sub(b.axis.p, a.axis.p), a.axis.d);
  const s1 = s0 + dot(b.axis.d, a.axis.d) * b.axis.len;
  const lo = Math.max(0, Math.min(s0, s1));
  const hi = Math.min(a.axis.len, Math.max(s0, s1));
  return hi - lo > 10 ? add(a.axis.p, mul(a.axis.d, (lo + hi) / 2)) : null;
}

/** Bourání a nový stav na stejném místě je záměr (výměna konstrukce), ne chyba. */
const swap = (a: Wall, b: Wall) =>
  a.status !== b.status && (a.status === 'demolished' || b.status === 'demolished');

function overlaps(bodies: readonly Body[]): CheckIssue[] {
  const out: CheckIssue[] = [];
  bodies.forEach((a, i) =>
    bodies.slice(i + 1).forEach((b) => {
      const at = !swap(a.wall, b.wall) && overlap(a, b);
      if (at)
        out.push({ kind: 'overlap', wallIds: [a.wall.id, b.wall.id], at, message: 'Stěny se překrývají' });
    }),
  );
  return out;
}

function unconnected(m: Model, bodies: readonly Body[]): CheckIssue[] {
  const out: CheckIssue[] = [];
  for (const a of bodies)
    for (const end of ['start', 'end'] as const) {
      if (endNode(m, a.wall.id, end).kind !== 'free') continue;
      const p = endPoint(a.wall.path, end);
      const near = bodies.find(
        (b) => b !== a && dist(p, nearestOnPath(b.wall.path, p).point) <= b.thickness + NEAR,
      );
      if (near)
        out.push({
          kind: 'unconnected',
          wallIds: [a.wall.id, near.wall.id],
          at: p,
          message: 'Konec stěny je u jiné stěny, ale není napojený',
        });
    }
  return out;
}

/** Všechna varování kontroly stěn (podlaží volitelně). */
export function checkWalls(m: Model, o: CheckOptions = {}): CheckIssue[] {
  const min = o.minLength ?? DEFAULT_MIN_LENGTH;
  const walls = allWalls(m).filter(
    (w) => w.variant.kind === 'main' && (!o.storeyId || w.storeyId === o.storeyId),
  );
  const byStorey = new Map<Id, Body[]>();
  for (const w of walls) byStorey.set(w.storeyId, [...(byStorey.get(w.storeyId) ?? []), bodyOf(m, w)]);
  const short: CheckIssue[] = walls
    .filter((w) => pathLength(w.path) < min)
    .map((w) => ({
      kind: 'short',
      wallIds: [w.id],
      at: endPoint(w.path, 'start'),
      message: `Stěna je kratší než ${min} mm`,
    }));
  const pairs = [...byStorey.values()].flatMap((bs) => {
    const over = overlaps(bs);
    // Dvojice, která se překrývá, se nehlásí ještě jako nenapojené konce (jedna chyba = jedno varování).
    const key = (ids: readonly Id[]) => [...ids].sort().join('|');
    const seen = new Set(over.map((i) => key(i.wallIds)));
    return [...over, ...unconnected(m, bs).filter((i) => !seen.has(key(i.wallIds)))];
  });
  return [...pairs, ...short];
}
