// Schránka (Ctrl+C / Ctrl+V / Ctrl+D): popis stěn a jejich napojení, ne odkazy na id.
// Vložení jde přes příkaz wall.paste, takže funguje i po smazání originálu.
import {
  boundsOf,
  connectionsWithin,
  specOf,
  type Id,
  type Model,
  type SpecConnection,
  type Vec2,
  type Wall,
  type WallSpec,
} from '@bim-light/core';

export interface Clipboard {
  readonly walls: readonly WallSpec[];
  readonly connections: readonly SpecConnection[];
  /** Základní bod (střed obálky), ke kterému se vztahuje poloha vložení. */
  readonly base: Vec2;
}

export function copyWalls(model: Model, ids: readonly Id[]): Clipboard | null {
  const walls = ids.map((id) => model.elements[id]).filter((w): w is Wall => !!w);
  if (!walls.length) return null;
  const b = boundsOf(walls.flatMap((w) => [w.path.start, w.path.end]));
  return {
    walls: walls.map(specOf),
    connections: connectionsWithin(
      model,
      walls.map((w) => w.id),
    ),
    base: { x: (b.x0 + b.x1) / 2, y: (b.y0 + b.y1) / 2 },
  };
}
