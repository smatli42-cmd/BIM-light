// Příkazy: zakřivit a vyrovnat stěnu (plán stěn Z5, katalog kreslení 5.5). Konce stěny zůstanou, mění
// se jen tvar referenční čáry; napojené stěny se natáhnou (T konce sklouznou na novou křivku) a otvory
// drží vzdálenost od začátku (opening/follow). Nevejde-li se otvor, editor změnu odmítne.
import { arcThrough, arcWithRadius, type Path, type Vec2 } from '../../geometry/index.ts';
import type { Id } from '../../ids/index.ts';
import type { Model } from '../../model/types.ts';
import { omitIds } from '../../model/update.ts';
import type { Wall } from '../../wall/types.ts';
import { wallOf } from '../lookup.ts';
import { S } from '../schema.ts';
import { defineCommand, fail } from '../types.ts';
import { applyWallChanges, both, WALL_IDS } from './shared.ts';

/** Kóty poloměru, které po vyrovnání nemají co měřit. */
function dropRadiusDims(model: Model, wallIds: readonly Id[]): Model {
  const ids = Object.values(model.dimensions)
    .filter((d) => d.kind === 'length' && d.measure && d.measure !== 'arc' && wallIds.includes(d.ref.wallId))
    .map((d) => d.id);
  return ids.length ? { ...model, dimensions: omitIds(model.dimensions, new Set(ids)) } : model;
}

function reshape(model: Model, walls: readonly Wall[], shape: (w: Wall) => Path): Model {
  const changed = walls.map((w) => ({ ...w, path: shape(w) }));
  return applyWallChanges(model, changed, new Map(changed.map((w) => [w.id, both('none')])));
}

/** Zakřiví stěnu na poloměr referenční čáry (se znaménkem strany středu). */
export const curveWall = (model: Model, wallId: Id, radius: number): Model =>
  reshape(model, [wallOf(model, wallId)], (x) => arcWithRadius(x.path.start, x.path.end, radius));

export interface CurveParams {
  wallId: Id;
  /** Bod, kterým oblouk prochází (tažení středu hrany). */
  through?: Vec2;
  /** Poloměr referenční čáry; kladný = střed vlevo od směru stěny. */
  radius?: number;
}

export const wallCurve = defineCommand<CurveParams>({
  name: 'wall.curve',
  label: 'Zakřivit stěnu',
  description:
    'Převede stěnu na oblouk (nebo změní oblouk) se stejnými konci: bodem, kterým oblouk prochází, nebo ' +
    'poloměrem referenční čáry (kladný = střed vlevo od směru stěny). Otvory drží vzdálenost od začátku.',
  group: 'Úpravy',
  params: S.object({ wallId: S.id, through: S.point, radius: S.number('mm (se znaménkem strany středu)') }, [
    'wallId',
  ]),
  run(model, p) {
    const w = wallOf(model, p.wallId);
    if (!p.through && p.radius === undefined) fail('invalid', 'Zadejte bod oblouku nebo poloměr');
    const shape = (x: Wall): Path =>
      p.through
        ? arcThrough(x.path.start, p.through, x.path.end)
        : arcWithRadius(x.path.start, x.path.end, p.radius ?? 0);
    const next = reshape(model, [w], shape);
    return { model: shape(w).kind === 'line' ? dropRadiusDims(next, [w.id]) : next };
  },
});

export const wallStraighten = defineCommand<{ wallIds: Id[] }>({
  name: 'wall.straighten',
  label: 'Vyrovnat stěnu',
  description:
    'Převede obloukové stěny na přímé se stejnými konci. Otvory drží vzdálenost od začátku; ' +
    'kóty tětivy a poloměru se smažou.',
  group: 'Úpravy',
  params: S.object({ wallIds: WALL_IDS }, ['wallIds']),
  run(model, p) {
    const walls = p.wallIds.map((id) => wallOf(model, id));
    const next = reshape(model, walls, (w) => ({ kind: 'line', start: w.path.start, end: w.path.end }));
    return { model: dropRadiusDims(next, p.wallIds) };
  },
});
