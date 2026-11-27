// Jakou kótu jde vložit mezi dva klinuté líce / hrany (nástroj Kóta, hlášení uživatele 2026-11-26):
// rovnoběžné líce (i soustředné líce téže obloukové stěny) = vzdálenost; hrany přes obloukovou stěnu
// (čelo, hrana otvoru – míří do středu oblouku) = délka po oblouku na líci blíž kliknutí (jako Revit
// „délka oblouku“). Jinak nic – nástroj řekne proč.
import {
  arcData,
  carrierOf,
  cross,
  dist,
  distanceToCarrier,
  tangentAt,
  type Vec2,
} from '../geometry/index.ts';
import type { Model } from '../model/types.ts';
import { getWall } from '../wall/queries.ts';
import { measuredFace } from './arc-dim.ts';
import { facePath } from './measure.ts';
import { orientPair } from './outline-ref.ts';
import { wallRefOf, type ArcMeasure, type DimRef } from './types.ts';

/** Odkazy páru s doplněným směrem rohů (desky D4) a případně měření po oblouku. */
export type DimensionPair = { readonly refs: [DimRef, DimRef]; readonly arc?: ArcMeasure } | null;

/** Střed obloukové stěny, nebo null u přímé. */
const arcCenter = (m: Model, id: string): Vec2 | null => {
  const p = m.elements[id] ? getWall(m, id).path : null;
  return p && p.kind === 'arc' && Math.abs(p.bulge) > 1e-9 ? arcData(p).center : null;
};

/** Kóta mezi `a` a `b`: {refs} = rovnoběžné, {refs, arc} = po oblouku, null = nejde. `near` = bod kliknutí. */
export function dimensionPair(model: Model, a0: DimRef, b0: DimRef, near: Vec2): DimensionPair {
  const [a, b] = orientPair(model, a0, b0, (r) => facePath(model, r));
  const [fa, fb] = [facePath(model, a), facePath(model, b)];
  if (Math.abs(cross(tangentAt(fa, 'start'), tangentAt(fb, 'start'))) <= 0.01) return { refs: [a, b] };
  if (fa.kind !== 'line' || fb.kind !== 'line') return null;
  const walls = [a, b].flatMap((r) => wallRefOf(r)?.wallId ?? []);
  for (const wallId of new Set(walls)) {
    const c = arcCenter(model, wallId);
    if (!c || distanceToCarrier(c, carrierOf(fa)) > 1 || distanceToCarrier(c, carrierOf(fb)) > 1) continue;
    const r = dist(near, c);
    const faces = (['ref', 'opp'] as const).map((face) => ({
      face,
      f: measuredFace(model, { wallId, face }),
    }));
    const pick = faces.reduce((x, y) =>
      Math.abs((x.f ? arcData(x.f).radius : 0) - r) <= Math.abs((y.f ? arcData(y.f).radius : 0) - r) ? x : y,
    );
    return { refs: [a, b], arc: { wallId, face: pick.face } };
  }
  return null;
}
