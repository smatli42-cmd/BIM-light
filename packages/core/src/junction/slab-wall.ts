// Napojení desky na stěnu (uložení stropu) podle priority materiálů – jedno pravidlo pro řez, 3D a výkazy
// (základ 7; Archicad priorita průniku, Revit „k jádru“ + Spojit geometrii). Deska a stěna, které se překrývají
// výškou i půdorysem:
// - Nosná deska s prioritou jádra ≥ priorita jádra stěny prořízne jádro stěny a vrstvy na straně desky (vnitřní
//   omítku) ve své výšce; vrstvy za vnějším lícem jádra (zateplení, vnější omítka) jdou přes čelo desky souvisle
//   a desku samy ořízne (deska končí na vnějším líci jádra).
// - Deska s nižší prioritou (dřevo na ŽB stěně) a podlaha (skladba podlahy) do stěny nezasahují – stěna je ořízne.
// Stejný materiál (beton × beton) se v řezu slije bez čáry. Nic se neukládá, počítá se z modelu.
import { clipRect, planePolygon, polygonsArea, type PlanePolygon } from '../covering/polygon.ts';
import type { Vec2 } from '../geometry/index.ts';
import type { Id } from '../ids/index.ts';
import type { Model } from '../model/types.ts';
import { slabPlan } from '../slab/plan.ts';
import { simplePieces } from '../section/pieces.ts';
import { signedArea, slabLevels } from '../slab/geometry.ts';
import { allSlabs } from '../slab/queries.ts';
import type { Slab } from '../slab/types.ts';
import { wallGeometry, type LayerGeometry } from '../wall/geometry.ts';
import { allWalls } from '../wall/queries.ts';
import type { Wall } from '../wall/types.ts';
import { wallHeight } from '../wall-height/resolve.ts';

/** Výřez: jednoduchý mnohoúhelník v půdorysu a výškový rozsah (mm nad ±0,000). */
export interface PlanCut {
  readonly footprint: readonly Vec2[];
  readonly bottom: number;
  readonly top: number;
}

export interface SlabWallCuts {
  /** Co desky vyřízly ze stěny: index vrstvy → výřezy. */
  readonly wall: ReadonlyMap<Id, ReadonlyMap<number, readonly PlanCut[]>>;
  /** Co stěny vyřízly z desky. */
  readonly slab: ReadonlyMap<Id, readonly PlanCut[]>;
}

const priority = (m: Model, materialId: Id) => m.materials[materialId]?.joinPriority ?? 0;

/** Priorita jádra desky (nosné vrstvy, jinak nejvyšší ze všech). */
function slabCorePriority(m: Model, s: Slab): number {
  const t = m.slabTypes[s.typeId];
  const layers = (t && m.compositions[t.compositionId]?.layers) || [];
  const core = layers.filter((l) => l.function === 'core');
  return Math.max(0, ...(core.length ? core : layers).map((l) => priority(m, l.materialId)));
}

const area = (polys: readonly PlanePolygon[], ring: readonly Vec2[]) =>
  ring.length >= 3 ? polygonsArea(clipRect(polys, ring)) : 0;

/** Rozdělení vrstev stěny: jádro, strana desky, vzdálená strana (za vnějším lícem jádra). */
function layerSides(layers: readonly LayerGeometry[], plan: readonly PlanePolygon[]) {
  const coreIdx = layers.flatMap((l, i) => (l.span.layer.function === 'core' ? [i] : []));
  const c0 = coreIdx.length ? Math.min(...coreIdx) : 0;
  const c1 = coreIdx.length ? Math.max(...coreIdx) : layers.length - 1;
  const sideArea = (idx: number[]) =>
    idx.reduce((s, i) => s + (layers[i]?.polygons ?? []).reduce((a, p) => a + Math.abs(signedArea(p)), 0), 0);
  const overlap = (idx: number[]) =>
    idx.reduce((s, i) => s + (layers[i]?.polygons ?? []).reduce((a, p) => a + area(plan, p), 0), 0);
  const ref = layers.map((_, i) => i).filter((i) => i < c0);
  const opp = layers.map((_, i) => i).filter((i) => i > c1);
  // Vzdálená strana (zateplení) = vrstvy, nad kterými deska z větší části neleží; deska po obou stranách
  // (vnitřní nosná stěna) = žádná vzdálená strana.
  // Vzdálená strana = strana se zateplením (obvodová stěna); bez izolace rozhodne překryv: vrstvy, nad kterými
  // deska z větší části neleží. Deska po obou stranách (vnitřní nosná stěna) = žádná vzdálená strana.
  const insulated = (idx: number[]) => idx.some((i) => layers[i]?.span.layer.function === 'insulation');
  if (insulated(ref) !== insulated(opp)) return { far: new Set(insulated(ref) ? ref : opp) };
  const outside = (idx: number[]) => idx.length > 0 && overlap(idx) < sideArea(idx) / 2;
  const far =
    outside(ref) && outside(opp)
      ? overlap(ref) <= overlap(opp)
        ? ref
        : opp
      : outside(ref)
        ? ref
        : outside(opp)
          ? opp
          : [];
  return { far: new Set(far) };
}

function pairCuts(m: Model, w: Wall, s: Slab, out: { wall: Map<number, PlanCut[]>; slab: PlanCut[] }) {
  const h = wallHeight(m, w);
  const lv = slabLevels(m, s);
  if (lv.bottom >= h.top || lv.top <= h.bottom) return;
  const plan = slabPlan(m, s);
  const g = wallGeometry(m, w, Number.NEGATIVE_INFINITY);
  if (!g.outlines.some((o) => area(plan, o) > 1)) return;
  const z = { bottom: lv.bottom, top: lv.top };
  const coreWall = Math.max(
    0,
    ...g.layers
      .filter((l) => l.span.layer.function === 'core')
      .map((l) => priority(m, l.span.layer.materialId)),
  );
  const wins = s.slabFunction === 'structure' && slabCorePriority(m, s) >= coreWall;
  const { far } = layerSides(g.layers, plan);
  g.layers.forEach((layer, i) => {
    if (wins && !far.has(i)) {
      const cuts = plan.flatMap(simplePieces).map((footprint) => ({ footprint, ...z }));
      out.wall.set(i, [...(out.wall.get(i) ?? []), ...cuts]);
    } else for (const p of layer.polygons) out.slab.push({ footprint: p, ...z });
  });
}

const cache = new WeakMap<Model, SlabWallCuts>();

/** Výřezy pro všechny dvojice stěna × deska modelu (hlavní model). */
export function slabWallCuts(m: Model): SlabWallCuts {
  const hit = cache.get(m);
  if (hit) return hit;
  const wall = new Map<Id, Map<number, PlanCut[]>>();
  const slab = new Map<Id, PlanCut[]>();
  const slabs = allSlabs(m).filter((s) => s.variant.kind === 'main');
  for (const w of allWalls(m)) {
    if (w.variant.kind !== 'main') continue;
    for (const s of slabs) {
      const out = { wall: wall.get(w.id) ?? new Map<number, PlanCut[]>(), slab: slab.get(s.id) ?? [] };
      pairCuts(m, w, s, out);
      if (out.wall.size) wall.set(w.id, out.wall);
      if (out.slab.length) slab.set(s.id, out.slab);
    }
  }
  const res = { wall, slab };
  cache.set(m, res);
  return res;
}

/** Výřezy desek ve vrstvě stěny. */
export const wallLayerSlabCuts = (m: Model, wallId: Id, layer: number): readonly PlanCut[] =>
  slabWallCuts(m).wall.get(wallId)?.get(layer) ?? [];

/** Výřezy stěn v desce. */
export const slabCutsByWalls = (m: Model, slabId: Id): readonly PlanCut[] =>
  slabWallCuts(m).slab.get(slabId) ?? [];

/** Plocha průniku jednoduchého mnohoúhelníku s obrysy (mm²) – pro výkazy. */
export const overlapArea = (polys: readonly (readonly Vec2[])[], ring: readonly Vec2[]): number =>
  polys.reduce((s, p) => s + area(planePolygon(p), ring), 0);
