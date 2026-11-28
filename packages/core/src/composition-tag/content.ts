// Obsah popisu skladby z modelu (základ 4): vrstvy typu řezaného prvku v pořadí a řádky textu; bod uchycení
// na výkrese z rozsahu řezaného prvku. Stěna: vrstvy výškového pásu v místě bodu uchycení (vícepásový typ),
// od referenční strany; deska: skladba shora dolů. Nic se neukládá.
import type { Vec2 } from '../geometry/index.ts';
import type { Model } from '../model/types.ts';
import type { CutRow } from '../section/content.ts';
import type { Section } from '../section/types.ts';
import { cachedSectionContent } from '../section-dim/value.ts';
import type { WallLayer } from '../wall-type/types.ts';
import { wallHeight } from '../wall-height/resolve.ts';
import type { Wall } from '../wall/types.ts';
import type { CompositionTag, CompositionTagOptions, TagAnchor } from './types.ts';

export interface TagLayer {
  readonly materialId: string;
  readonly material: string;
  readonly thickness: number;
}

/** Řezaný prvek na výkrese (rozsah u, z); null = rovina řezu prvek neprotíná. */
export function cutRowOf(model: Model, s: Section, elementId: string): CutRow | null {
  return cachedSectionContent(model, s).cut.find((r) => r.elementId === elementId) ?? null;
}

/** Bod uchycení na výkrese (u, z). */
export const anchorPoint = (row: CutRow, a: TagAnchor): Vec2 => ({
  x: row.u0 + (row.u1 - row.u0) * a.s,
  y: row.bottom + (row.top - row.bottom) * a.t,
});

/** Poměrový bod uchycení z bodu výkresu (oříznutý na prvek). */
export function anchorOf(row: CutRow, p: Vec2): TagAnchor {
  const clamp = (v: number) => Math.min(1, Math.max(0, Number.isFinite(v) ? v : 0.5));
  return {
    s: clamp((p.x - row.u0) / (row.u1 - row.u0)),
    t: clamp((p.y - row.bottom) / (row.top - row.bottom)),
  };
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
): { title: string; layers: TagLayer[] } | null {
  const el = model.elements[elementId];
  if (!el) return null;
  let raw: readonly WallLayer[];
  let title: string;
  if (el.category === 'wall') {
    const t = model.wallTypes[el.typeId];
    raw = wallLayers(model, el as Wall, z);
    title = t ? `${t.mark ? `${t.mark} ` : ''}${t.name}` : '';
  } else if (el.category === 'slab') {
    const t = model.slabTypes[el.typeId];
    const comp = t ? model.compositions[t.compositionId] : undefined;
    // Skladba desky je uložená odspodu; popis jde shora dolů (ČSN, Revit).
    raw = comp ? [...comp.layers].reverse() : [];
    title = t ? `${t.mark ? `${t.mark} ` : ''}${t.name}` : '';
  } else return null;
  if (!raw.length) return null;
  const ordered = reverse ? [...raw].reverse() : raw;
  const layers = ordered.map((l) => ({
    materialId: l.materialId,
    material: model.materials[l.materialId]?.name ?? l.materialId,
    thickness: l.thickness,
  }));
  return { title, layers };
}

const mm = (n: number) => String(Math.round(n * 10) / 10).replace('.', ',');

/** Řádky textu popisu: název typu s celkovou tloušťkou, pak vrstvy (odrážka / číslo, materiál, tloušťka). */
export function tagLines(
  c: { title: string; layers: readonly TagLayer[] },
  o: CompositionTagOptions,
): string[] {
  const total = c.layers.reduce((a, l) => a + l.thickness, 0);
  const head = o.title && c.title ? [`${c.title} – ${mm(total)} mm`] : [];
  return [
    ...head,
    ...c.layers.map(
      (l, i) =>
        `${o.numbered ? `${i + 1}.` : '–'} ${l.material}${o.thickness ? ` ${mm(l.thickness)} mm` : ''}`,
    ),
  ];
}

export interface TagLayout {
  readonly anchor: Vec2;
  /** Začátek poličky (pod prvním řádkem). */
  readonly textAt: Vec2;
  readonly lines: readonly string[];
  readonly layers: readonly TagLayer[];
}

/** Rozvržení popisu z modelu; null = prvek už rovina řezu neprotíná nebo nemá skladbu. */
export function tagLayout(model: Model, s: Section, tag: CompositionTag): TagLayout | null {
  const row = cutRowOf(model, s, tag.elementId);
  if (!row) return null;
  const anchor = anchorPoint(row, tag.anchor);
  const c = tagLayers(model, tag.elementId, anchor.y, tag.reverse);
  if (!c) return null;
  return {
    anchor,
    textAt: { x: anchor.x + tag.offset.x, y: anchor.y + tag.offset.y },
    lines: tagLines(c, tag),
    layers: c.layers,
  };
}
