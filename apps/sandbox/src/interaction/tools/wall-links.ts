// Napojení nové stěny na existující (základ 24): logika je v jádře (`connectionAt`), stejná pro
// myš i pro AI. Tady jen obálka nad sezením a tloušťka typu pro náhled.
import {
  bandThickness,
  connectionAt as coreConnectionAt,
  type AutoLink,
  type Id,
  type Model,
  type Vec2,
} from '@bim-light/core';
import type { Session } from '../../session/session.ts';

export type Link = AutoLink;

/** Kam se napojí konec nové stěny ležící v bodě `p` (nebo null). */
export function connectionAt(s: Session, p: Vec2, exclude: readonly Id[], dir?: Vec2): Link | null {
  return coreConnectionAt(s.model, s.storeyId, p, exclude, dir, s.options.newStatus);
}

/** Tloušťka typu stěny (první pás) pro náhled. */
export function typeThickness(model: Model, typeId: Id): number {
  const band = model.wallTypes[typeId]?.bands[0];
  return band ? bandThickness(band) : 0;
}
