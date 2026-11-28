// Výchozí obsah nového popisu skladby (nástroj Popis skladby, info box): číslování, tloušťky, název typu,
// obrácené pořadí. Jen stav rozhraní; nový popis je dostane jako parametry příkazu compositionTag.create.
import { TAG_DEFAULTS, type CompositionTagOptions } from '@bim-light/core';
import type { Session } from './session.ts';

const store = new WeakMap<Session, CompositionTagOptions>();

export function tagDefaults(s: Session): CompositionTagOptions {
  let d = store.get(s);
  if (!d) store.set(s, (d = { ...TAG_DEFAULTS }));
  return d;
}

export function setTagDefaults(s: Session, patch: Partial<CompositionTagOptions>) {
  store.set(s, { ...tagDefaults(s), ...patch });
  s.changed();
}
