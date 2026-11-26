// Výměry stěny pro výkazy (plán stěn Z8): délka osy, výška, plochy boku a objemy po vrstvách.
// Vše z geometrie po napojení (základ 4): objem vrstvy = plocha jejího obrysu v půdorysu × výška − otvory.
import { pathLength } from '../geometry/index.ts';
import { signedArea } from '../junction/half-plane.ts';
import type { Model } from '../model/types.ts';
import type { Opening } from '../opening/types.ts';
import { wallGeometry } from '../wall/geometry.ts';
import type { LayerSpan } from '../wall/layers.ts';
import type { Wall } from '../wall/types.ts';
import { wallHeight } from '../wall-height/resolve.ts';

export interface LayerQuantity {
  readonly span: LayerSpan;
  /** Plocha vrstvy (m²) po odečtu otvorů podle pravidla. */
  readonly area: number;
  /** Objem vrstvy (m³) po odečtu všech otvorů a nik. */
  readonly volume: number;
}

export interface WallQuantities {
  /** Délka osy po napojení (m). */
  readonly length: number;
  /** Výška (m). */
  readonly height: number;
  /** Plocha boku = délka osy × výška (m²). */
  readonly grossArea: number;
  /** Odečtené otvory (m²) – jen průchozí nad mezí. */
  readonly openingArea: number;
  readonly netArea: number;
  readonly volume: number;
  readonly openings: number;
  readonly layers: readonly LayerQuantity[];
}

const M2 = 1e6;
const M3 = 1e9;

/** Hloubka, kterou nika zasahuje do vrstvy (mm): průnik intervalu niky s intervalem vrstvy. */
function nicheDepthIn(o: Opening, span: LayerSpan, faces: { ref: number; opp: number }): number {
  const start = o.side === 'ref' ? faces.ref : faces.opp;
  const other = o.side === 'ref' ? faces.opp : faces.ref;
  const end = start + Math.sign(other - start) * o.depth;
  const [a, b] = [Math.min(start, end), Math.max(start, end)];
  const [c, d] = [Math.min(span.from, span.to), Math.max(span.from, span.to)];
  return Math.max(0, Math.min(b, d) - Math.max(a, c));
}

/** Výměry stěny; `minOpeningArea` (m²) = otvory do této plochy se z ploch neodečítají. */
export function wallQuantities(m: Model, w: Wall, minOpeningArea: number): WallQuantities {
  const geom = wallGeometry(m, w, Number.NEGATIVE_INFINITY);
  const h = wallHeight(m, w).height;
  const openings = Object.values(m.openings).filter((o) => o.hostId === w.id);
  const through = openings.filter((o) => o.kind === 'through');
  const deducted = through.filter((o) => (o.width * o.height) / M2 > minOpeningArea);
  const deductMm2 = deducted.reduce((s, o) => s + o.width * o.height, 0);
  const lengthMm = pathLength(geom.faces.axis);
  const faces = { ref: geom.section.faces.ref, opp: geom.section.faces.opp };
  const layers = geom.layers.map((l) => {
    const t = Math.abs(l.span.to - l.span.from);
    const plan = l.polygons.reduce((s, p) => s + Math.abs(signedArea(p)), 0);
    const holes = through.reduce((s, o) => s + o.width * o.height * t, 0);
    const niches = openings
      .filter((o) => o.kind === 'niche')
      .reduce((s, o) => s + o.width * o.height * nicheDepthIn(o, l.span, faces), 0);
    const faceMm2 = t > 0 ? (plan / t) * h : 0;
    return {
      span: l.span,
      area: Math.max(0, faceMm2 - deductMm2) / M2,
      volume: Math.max(0, plan * h - holes - niches) / M3,
    };
  });
  const grossArea = (lengthMm * h) / M2;
  return {
    length: lengthMm / 1000,
    height: h / 1000,
    grossArea,
    openingArea: deductMm2 / M2,
    netArea: Math.max(0, grossArea - deductMm2 / M2),
    volume: layers.reduce((s, l) => s + l.volume, 0),
    openings: openings.length,
    layers,
  };
}
