// Půdorysná geometrie stěny počítaná z modelu (základ 4): líce, hranice vrstev, obrys.
// Nic z toho se neukládá; vždy se přepočítá z referenční čáry, typu a napojení.
import {
  carrierOf,
  endPoint,
  intersectNearest,
  offsetPath,
  tessellate,
  withEnd,
  type Path,
  type PathEnd,
  type Vec2,
} from '../geometry/index.ts';
import type { Id } from '../ids/index.ts';
import type { Model } from '../model/types.ts';
import { endCut, type EndCut } from './joins.ts';
import type { CrossSection, LayerSpan } from './layers.ts';
import { allWalls, wallSection } from './queries.ts';
import type { Wall, WallFace } from './types.ts';

export interface LayerGeometry {
  readonly span: LayerSpan;
  readonly polygon: readonly Vec2[];
}

export interface WallGeometry {
  readonly wallId: Id;
  readonly section: CrossSection;
  readonly cuts: Readonly<Record<PathEnd, EndCut>>;
  /** Líce a osa oříznuté podle napojení. */
  readonly faces: Readonly<Record<WallFace, Path>>;
  /** Vnitřní hranice mezi vrstvami (bez líců). */
  readonly layerBoundaries: readonly Path[];
  readonly layers: readonly LayerGeometry[];
  /** Obrys stěny (uzavřený mnohoúhelník, oblouky rozložené na body). */
  readonly outline: readonly Vec2[];
}

/** Rovnoběžná čára v offsetu `o`, na koncích oříznutá zakončeními. */
export function trimmedOffset(path: Path, o: number, cuts: Record<PathEnd, EndCut>, limit: number): Path {
  let p = offsetPath(path, o);
  for (const end of ['start', 'end'] as const) {
    const at = endPoint(p, end);
    const hit = intersectNearest(carrierOf(p), cuts[end].cut, at, limit);
    if (hit) p = withEnd(p, end, hit);
  }
  return p;
}

const polygonBetween = (a: Path, b: Path): Vec2[] => [...tessellate(a), ...tessellate(b).reverse()];

export function wallGeometry(model: Model, wall: Wall): WallGeometry {
  const section = wallSection(model, wall);
  const cuts = { start: endCut(model, wall, 'start'), end: endCut(model, wall, 'end') };
  const limit = 6 * section.thickness + 1000;
  const at = (o: number) => trimmedOffset(wall.path, o, cuts, limit);
  const faces = { ref: at(section.faces.ref), opp: at(section.faces.opp), axis: at(section.faces.axis) };
  const layers = section.layers.map((span) => ({
    span,
    polygon: polygonBetween(at(span.from), at(span.to)),
  }));
  const layerBoundaries = section.layers.slice(1).map((span) => at(span.from));
  return {
    wallId: wall.id,
    section,
    cuts,
    faces,
    layerBoundaries,
    layers,
    outline: polygonBetween(faces.ref, faces.opp),
  };
}

/** Geometrie všech stěn modelu (případně jen jednoho podlaží). */
export function allWallGeometry(model: Model, storeyId?: Id): Map<Id, WallGeometry> {
  const out = new Map<Id, WallGeometry>();
  for (const w of allWalls(model)) {
    if (storeyId === undefined || w.storeyId === storeyId) out.set(w.id, wallGeometry(model, w));
  }
  return out;
}
