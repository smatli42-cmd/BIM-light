// Zakrývání pohledových hran (skryté čáry se v řezu a pohledu nekreslí, české zvyklosti): úsečka prvku
// zůstane jen tam, kde před ní neleží plocha bližšího prvku. Plochy jsou v rovině výkresu (u, z), každá
// s hloubkou za rovinou řezu (nejbližší bod prvku); řezané konstrukce mají hloubku −1 a zakryjí vše.
import type { Vec2 } from '../geometry/index.ts';
import type { Id } from '../ids/index.ts';
import type { FrontDepth } from './front.ts';
import { FACE_TOL } from './projection.ts';

export interface Occluder {
  readonly elementId: Id;
  readonly depth: number;
  /** Smyčky plochy (vnější obrys i díry; uvnitř = pravidlo sudé-liché). */
  readonly rings: readonly (readonly Vec2[])[];
  readonly box: { readonly min: Vec2; readonly max: Vec2 };
  /** Hloubka předního líce v místě u (svislé prvky); bez ní všude `depth`. */
  readonly front?: FrontDepth;
}

/** Kreslený prvek: id, nejbližší hloubka a případně hloubka předního líce po šířce. */
export type Drawn = Pick<Occluder, 'elementId' | 'depth' | 'front'>;

const depthAt = (o: Drawn, u: number) => (o.front ? o.front(u) : o.depth);

/**
 * Zakryje plocha `o` bod prvku `e` v místě u? Bližší líc zakryje vždy; dva svislé prvky ve stejném líci
 * (napojené stěny, čelo stěny viděné z boku v líci fasády) zakrývají vnitřní hrany jeden druhému – líc je
 * jedna plocha (Revit / Archicad spojené konstrukce, hlášení uživatele 2026-11-28).
 */
function covers(o: Occluder, e: Drawn, u: number): boolean {
  const dO = depthAt(o, u);
  const dE = depthAt(e, u);
  if (o.front && e.front) return dO <= dE + FACE_TOL;
  return dO < dE;
}

/** Tolerance (mm): bod na hraně plochy není zakrytý (sdílené hrany zůstanou vidět). */
const EDGE = 0.5;

export function occluder(
  elementId: Id,
  depth: number,
  rings: readonly (readonly Vec2[])[],
  front?: FrontDepth,
): Occluder {
  const pts = rings.flat();
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  return {
    elementId,
    depth,
    rings,
    box: { min: { x: Math.min(...xs), y: Math.min(...ys) }, max: { x: Math.max(...xs), y: Math.max(...ys) } },
    ...(front ? { front } : {}),
  };
}

function nearEdge(p: Vec2, a: Vec2, b: Vec2): boolean {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const l2 = dx * dx + dy * dy;
  const t = l2 ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2)) : 0;
  return Math.hypot(p.x - a.x - dx * t, p.y - a.y - dy * t) < EDGE;
}

/** Je bod uvnitř plochy (ne na její hraně)? */
export function inside(o: Occluder, p: Vec2): boolean {
  let odd = false;
  for (const r of o.rings)
    for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
      const a = r[i] as Vec2;
      const b = r[j] as Vec2;
      if (nearEdge(p, a, b)) return false;
      if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) odd = !odd;
    }
  return odd;
}

/** Parametry t (0–1) průsečíků úsečky a–b s hranami plochy. */
function crossings(a: Vec2, b: Vec2, o: Occluder): number[] {
  const out: number[] = [];
  const d = { x: b.x - a.x, y: b.y - a.y };
  for (const r of o.rings)
    for (let i = 0; i < r.length; i++) {
      const p = r[i] as Vec2;
      const q = r[(i + 1) % r.length] as Vec2;
      const e = { x: q.x - p.x, y: q.y - p.y };
      const den = d.x * e.y - d.y * e.x;
      if (Math.abs(den) < 1e-12) continue;
      const t = ((p.x - a.x) * e.y - (p.y - a.y) * e.x) / den;
      const s = ((p.x - a.x) * d.y - (p.y - a.y) * d.x) / den;
      if (t > 0 && t < 1 && s >= -1e-9 && s <= 1 + 1e-9) out.push(t);
    }
  return out;
}

const overlaps = (a: Vec2, b: Vec2, o: Occluder) =>
  Math.max(a.x, b.x) >= o.box.min.x &&
  Math.min(a.x, b.x) <= o.box.max.x &&
  Math.max(a.y, b.y) >= o.box.min.y &&
  Math.min(a.y, b.y) <= o.box.max.y;

/** Viditelné části úsečky kresleného prvku `e`. */
export function visibleParts(a: Vec2, b: Vec2, e: Drawn, occluders: readonly Occluder[]): [Vec2, Vec2][] {
  const near = occluders.filter(
    (o) => o.elementId !== e.elementId && (o.front || o.depth < e.depth || e.front) && overlaps(a, b, o),
  );
  if (!near.length) return [[a, b]];
  const ts = [0, 1, ...near.flatMap((o) => crossings(a, b, o))].sort((x, y) => x - y);
  const at = (t: number): Vec2 => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
  const out: [Vec2, Vec2][] = [];
  let open: number | null = null;
  for (let i = 0; i + 1 < ts.length; i++) {
    const t0 = ts[i] as number;
    const t1 = ts[i + 1] as number;
    if (t1 - t0 < 1e-9) continue;
    const m = at((t0 + t1) / 2);
    const hidden = near.some((o) => inside(o, m) && covers(o, e, m.x));
    if (!hidden && open === null) open = t0;
    if (hidden && open !== null) {
      out.push([at(open), at(t0)]);
      open = null;
    }
  }
  if (open !== null) out.push([at(open), b]);
  return out;
}
