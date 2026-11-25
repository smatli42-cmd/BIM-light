// Půdorysná geometrie stěny počítaná z modelu (základ 4): líce, obrys a obrys každé vrstvy po napojení
// (plán stěn Z2, složka junction/). Nic z toho se neukládá; vždy se přepočítá z referenční čáry, typu,
// napojení a priorit materiálů.
import { offsetPath, type Path, type PathEnd, type Vec2 } from '../geometry/index.ts';
import type { Id } from '../ids/index.ts';
import { signedArea } from '../junction/half-plane.ts';
import { trimPath } from '../junction/trim.ts';
import type { EndJoin, LayerEnd } from '../junction/types.ts';
import { wallJunction } from '../junction/wall.ts';
import type { Model } from '../model/types.ts';
import type { CrossSection, LayerSpan } from './layers.ts';
import { allWalls, wallSection } from './queries.ts';
import type { Wall, WallFace } from './types.ts';

export type { EndJoin } from '../junction/types.ts';

export interface LayerGeometry {
  readonly span: LayerSpan;
  /** Obrys vrstvy po napojení (obvykle jeden mnohoúhelník; hostitel v T / kříži jich může mít víc). */
  readonly polygons: readonly (readonly Vec2[])[];
}

export interface WallGeometry {
  readonly wallId: Id;
  readonly section: CrossSection;
  /** Referenční čára stěny (osa pro šrafy přes šířku vrstvy). */
  readonly path: Path;
  /** Druh napojení na každém konci. */
  readonly cuts: Readonly<Record<PathEnd, { readonly join: EndJoin }>>;
  /** Líce a osa oříznuté podle napojení vrstev. */
  readonly faces: Readonly<Record<WallFace, Path>>;
  readonly layers: readonly LayerGeometry[];
  /** Obrys stěny (největší smyčka sjednocení vrstev, oblouky rozložené na body). */
  readonly outline: readonly Vec2[];
  /** Všechny smyčky obrysu (stěna rozdělená křížem jich může mít víc). */
  readonly outlines: readonly (readonly Vec2[])[];
}

/** Index vrstvy, ve které leží offset (líc: krajní vrstva). */
function layerAt(section: CrossSection, o: number): number {
  const i = section.layers.findIndex(
    (l) => o >= Math.min(l.from, l.to) - 1e-9 && o <= Math.max(l.from, l.to) + 1e-9,
  );
  return Math.max(0, i);
}

/** Geometrie stěny; `cutPlane` = rovina řezu pohledu nad podlažím (otvory v ní stěnu přeruší, Z4). */
export function wallGeometry(model: Model, wall: Wall, cutPlane?: number): WallGeometry {
  const j = wallJunction(model, wall, cutPlane);
  const section = wallSection(model, wall);
  const empty: LayerEnd = { variants: [[]], extend: 0, extras: [] };
  const face = (o: number, i: number) =>
    trimPath(offsetPath(wall.path, o), {
      start: j.ends.start.layers[i] ?? empty,
      end: j.ends.end.layers[i] ?? empty,
    });
  const last = section.layers.length - 1;
  const faces = {
    ref: face(section.faces.ref, 0),
    opp: face(section.faces.opp, last),
    axis: face(section.faces.axis, layerAt(section, section.faces.axis)),
  };
  const outlines = j.outlines;
  const outline = [...outlines].sort((a, b) => Math.abs(signedArea(b)) - Math.abs(signedArea(a)))[0] ?? [];
  return {
    wallId: wall.id,
    path: wall.path,
    section,
    cuts: { start: { join: j.joins.start }, end: { join: j.joins.end } },
    faces,
    layers: section.layers.map((span, i) => ({ span, polygons: j.layers[i] ?? [] })),
    outline,
    outlines,
  };
}

/** Geometrie všech stěn modelu (případně jen jednoho podlaží). */
export function allWallGeometry(model: Model, storeyId?: Id, cutPlane?: number): Map<Id, WallGeometry> {
  const out = new Map<Id, WallGeometry>();
  for (const w of allWalls(model)) {
    if (storeyId === undefined || w.storeyId === storeyId) out.set(w.id, wallGeometry(model, w, cutPlane));
  }
  return out;
}
