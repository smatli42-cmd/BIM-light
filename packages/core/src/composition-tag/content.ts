// Obsah popisu skladby z modelu (základ 4): vrstvy typu řezaného prvku v pořadí a řádky textu; bod uchycení
// a kolmice z průřezu (cross.ts), odkazová čára kolmo přes celou konstrukci. Stěna: vrstvy výškového pásu
// v místě bodu uchycení (vícepásový typ), od referenční strany; deska a střecha: skladba shora dolů (střecha
// od krytiny k SDK, číslo = značka typu střechy). Nic se neukládá.
import type { Vec2 } from '../geometry/index.ts';
import type { Model } from '../model/types.ts';
import type { Section } from '../section/types.ts';
import type { WallLayer } from '../wall-type/types.ts';
import { wallHeight } from '../wall-height/resolve.ts';
import type { Wall } from '../wall/types.ts';
import { tagCross } from './cross.ts';
import { normalizeLeader, onPerpendicular } from './leader.ts';
import type { CompositionTag, CompositionTagOptions } from './types.ts';

export { anchorOf, anchorPoint, cutRowOf } from './cross.ts';

export interface TagLayer {
  readonly materialId: string;
  readonly material: string;
  readonly thickness: number;
}

function wallLayers(model: Model, wall: Wall, z: number): readonly WallLayer[] {
  const h = wallHeight(model, wall);
  const band = h.bands.find((b) => z >= b.bottom && z <= b.top) ?? h.bands[0];
  if (band) return band.layers.map((l) => l.layer);
  return model.wallTypes[wall.typeId]?.bands[0]?.layers ?? [];
}

/** Vrstvy skladby prvku v pořadí popisu a název typu; null = prvek nemá skladbu. */
export function tagLayers(
  model: Model,
  elementId: string,
  z: number,
  reverse: boolean,
): { title: string; mark: string; layers: TagLayer[] } | null {
  const el = model.elements[elementId];
  if (!el) return null;
  let raw: readonly WallLayer[];
  let title: string;
  let mark: string;
  if (el.category === 'wall') {
    const t = model.wallTypes[el.typeId];
    raw = wallLayers(model, el as Wall, z);
    title = t?.name ?? '';
    mark = t?.mark ?? '';
  } else if (el.category === 'slab' || el.category === 'roof') {
    const t = el.category === 'slab' ? model.slabTypes[el.typeId] : model.roofTypes[el.typeId];
    const comp = t ? model.compositions[t.compositionId] : undefined;
    // Skladba desky i střechy je uložená odspodu; popis jde shora dolů (ČSN, Revit).
    raw = comp ? [...comp.layers].reverse() : [];
    title = t?.name ?? '';
    mark = t?.mark ?? '';
  } else return null;
  if (!raw.length) return null;
  const ordered = reverse ? [...raw].reverse() : raw;
  const layers = ordered.map((l) => ({
    materialId: l.materialId,
    material: model.materials[l.materialId]?.name ?? l.materialId,
    thickness: l.thickness,
  }));
  return { title, mark, layers };
}

const mm = (n: number) => String(Math.round(n * 10) / 10).replace('.', ',');

/** Řádky vrstev popisu: (název typu s celkovou tloušťkou), číslo, materiál, „tl. 20 mm“. */
export function tagLines(
  c: { title: string; layers: readonly TagLayer[] },
  o: Pick<CompositionTagOptions, 'title' | 'numbered' | 'thickness'>,
): string[] {
  const total = c.layers.reduce((a, l) => a + l.thickness, 0);
  const head = o.title && c.title ? [`${c.title} – ${mm(total)} mm`] : [];
  return [
    ...head,
    ...c.layers.map(
      (l, i) =>
        `${o.numbered ? `${i + 1}. ` : ''}${l.material}${o.thickness ? ` tl. ${mm(l.thickness)} mm` : ''}`,
    ),
  ];
}

export interface TagLayout {
  readonly anchor: Vec2;
  /** Odkazová čára: od protilehlého líce konstrukce kolmo přes ni a dál přes body (poslední = spodek popisky). */
  readonly path: readonly Vec2[];
  /** Konec čáry = spodek svislé čáry popisky; nad ním řádky a nahoře kolečko. */
  readonly end: Vec2;
  /** Číslo konstrukce v kolečku; null = bez kolečka. */
  readonly mark: string | null;
  readonly lines: readonly string[];
  readonly layers: readonly TagLayer[];
}

/** Rozvržení popisu z modelu; null = prvek už rovina řezu neprotíná nebo nemá skladbu. */
export function tagLayout(model: Model, s: Section, tag: CompositionTag): TagLayout | null {
  const cross = tagCross(model, s, tag.elementId, tag.anchor);
  if (!cross) return null;
  const { anchor, axis } = cross;
  const c = tagLayers(model, tag.elementId, anchor.y, tag.reverse);
  const leader = normalizeLeader(axis, tag.leader) ?? [onPerpendicular(axis, { x: 1000, y: 1000 })];
  if (!c) return null;
  const pts = leader.map((p) => ({ x: anchor.x + p.x, y: anchor.y + p.y }));
  const first = leader[0] as Vec2;
  // Čára protne celou konstrukci: začíná na líci na opačné straně, než jde čára ven.
  const far = first.x * axis.x + first.y * axis.y >= 0 ? cross.back : cross.front;
  return {
    anchor,
    path: [far, ...pts],
    end: pts[pts.length - 1] as Vec2,
    mark: tag.mark && c.mark ? c.mark : null,
    lines: tagLines(c, tag),
    layers: c.layers,
  };
}
