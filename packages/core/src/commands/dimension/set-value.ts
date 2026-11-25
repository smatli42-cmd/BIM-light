// Příkaz: změna čísla v kótě (základ 25; pravidla-interakce: kóty 1, 9; katalog kreslení 3.3–3.4).
// Pohne se vybraná stěna z dvojice, jinak ta, ze které kóta vznikla. Zámek se změnou čísla nemění.
import { pathLength, rotatePath } from '../../geometry/index.ts';
import type { Id } from '../../ids/index.ts';
import type { Model } from '../../model/types.ts';
import { putDimensions } from '../../model/update.ts';
import { angleGeometry, facePath, measureDimension } from '../../dimension/measure.ts';
import { isCap } from '../../wall/edges.ts';
import type { Dimension, LinearDimension } from '../../dimension/types.ts';
import { putOpenings } from '../../model/update.ts';
import type { Opening } from '../../opening/types.ts';
import { assertOpenings } from '../opening/shared.ts';
import { dimensionOf } from '../lookup.ts';
import { S, type JsonSchema } from '../schema.ts';
import { CommandFailure, defineCommand, fail } from '../types.ts';
import { setWallLength } from '../wall/endpoint.ts';
import { offsetWall, transformWalls } from '../wall/move.ts';
import { END_SCHEMA } from '../wall/shared.ts';
import type { PathEnd } from '../../geometry/index.ts';

export interface SetValueParams {
  dimensionId: Id;
  value: number;
  /** Který odkaz kóty se hýbe (vybraná stěna); výchozí = ten, ze kterého kóta vznikla. */
  moveRef?: 0 | 1;
  /** U délkové kóty: uchopený konec stěny. */
  end?: PathEnd;
}

/** Ze dvou možných směrů vybere ten, po kterém má kóta požadovanou hodnotu. */
function closest(d: Dimension, value: number, tries: (() => Model)[]): Model {
  let best: { m: Model; err: number } | null = null;
  for (const attempt of tries) {
    try {
      const m = attempt();
      const err = Math.abs(measureDimension(m, d) - value);
      if (!best || err < best.err) best = { m, err };
    } catch (e) {
      if (!(e instanceof CommandFailure)) throw e;
    }
  }
  return best ? best.m : fail('invalid', 'Hodnotu kóty nelze nastavit');
}

/**
 * Kóta k hraně otvoru (Z4): pohne se otvor po stěně; kóta mezi oběma hranami téhož otvoru = šířka
 * (druhá hrana stojí).
 */
function moveOpeningEdge(model: Model, d: LinearDimension, value: number, mover: 0 | 1): Model {
  const ref = d.refs[mover];
  const other = d.refs[mover === 0 ? 1 : 0];
  const o = model.openings[ref.openingId as Id] ?? fail('not-found', 'Otvor neexistuje');
  const delta = value - measureDimension(model, d);
  const put = (x: Opening) => () => assertOpenings(putOpenings(model, [x]), [x.id]);
  if (other.openingId === o.id) {
    const width =
      ref.face === 'end'
        ? { ...o, width: value }
        : { ...o, width: value, offset: o.offset + o.width - value };
    return closest(d, value, [put(width)]);
  }
  return closest(d, value, [
    put({ ...o, offset: o.offset + delta }),
    put({ ...o, offset: o.offset - delta }),
  ]);
}

function applyValue(model: Model, d: Dimension, p: SetValueParams): Model {
  const current = measureDimension(model, d);
  const delta = p.value - current;
  if (d.kind === 'length') {
    const face = isCap(d.ref.face) ? 'ref' : d.ref.face;
    return setWallLength(model, { wallId: d.ref.wallId, end: p.end ?? 'end', length: p.value, face });
  }
  const mover = p.moveRef ?? d.ownerRef;
  if (d.kind === 'linear') {
    const ref = d.refs[mover];
    if (ref.openingId) return moveOpeningEdge(model, d, p.value, mover);
    const cap = ref.face;
    if (isCap(cap)) {
      // Čelo volného konce: změna čísla prodlouží / zkrátí stěnu na tomto konci.
      const length = pathLength(facePath(model, { wallId: ref.wallId, face: 'ref' }));
      const at = (l: number) => () => setWallLength(model, { wallId: ref.wallId, end: cap, length: l });
      return closest(d, p.value, [at(length + delta), at(length - delta)]);
    }
    if (ref.wallId === d.refs[mover === 0 ? 1 : 0].wallId) {
      fail('invalid', 'Tloušťka stěny se mění v typu nebo příkazem Tloušťka stěny');
    }
    return closest(d, p.value, [
      () => offsetWall(model, ref.wallId, delta),
      () => offsetWall(model, ref.wallId, -delta),
    ]);
  }
  const g = angleGeometry(model, d.wallIds) ?? fail('invalid', 'Stěny se neprotínají');
  const rad = (delta * Math.PI) / 180;
  const wallId = d.wallIds[mover];
  const turn = (a: number) => () => transformWalls(model, [wallId], (path) => rotatePath(path, g.vertex, a));
  return closest(d, p.value, [turn(rad), turn(-rad)]);
}

export const dimensionSetValue = defineCommand<SetValueParams>({
  name: 'dimension.setValue',
  label: 'Změnit číslo kóty',
  description:
    'Nastaví hodnotu kóty posunem prvku: pohne se vybraná stěna (moveRef), jinak ta, ze které kóta vznikla; ' +
    'u délky se pohne uchopený konec. Zámek se tím nezapne ani nevypne.',
  group: 'Kóta',
  params: S.object(
    {
      dimensionId: S.id,
      value: S.number('mm nebo stupně', { exclusiveMinimum: 0 }),
      moveRef: { type: 'integer', enum: [0, 1] } as JsonSchema,
      end: END_SCHEMA,
    },
    ['dimensionId', 'value'],
  ),
  run(model, p) {
    const d = dimensionOf(model, p.dimensionId);
    const next = applyValue(model, d, p);
    const updated = next.dimensions[d.id];
    return { model: updated?.locked ? putDimensions(next, [{ ...updated, value: p.value }]) : next };
  },
});
