// Pomůcky receptů s elektrem (koncepce 3): prvek na nejbližší stěnu bodem uvnitř místnosti (bod se
// promítne na líc), prvek na strop, pohled ve stylu Elektro 1:50. Jen příkazy z registru (základ 6).
import { electroTypeId } from '../electro/library.ts';
import { nearestOnPath, type Vec2 } from '../geometry/index.ts';
import type { Id } from '../ids/index.ts';
import { allWalls } from '../wall/queries.ts';
import type { SampleContext } from './types.ts';

/** Nejbližší stěna podlaží k bodu. */
export function wallNear(c: SampleContext, p: Vec2, storeyId = c.storeyId): Id {
  let best = { id: '', d: Infinity };
  for (const w of allWalls(c.model)) {
    if (w.storeyId !== storeyId || w.status === 'demolished') continue;
    const d = nearestOnPath(w.path, p).distance;
    if (d < best.d) best = { id: w.id, d };
  }
  return best.id;
}

/** Elektro prvek na líc nejbližší stěny (bod uvnitř místnosti určí stranu). */
export const onWall = (c: SampleContext, key: string, p: Vec2, extra: Record<string, unknown> = {}) =>
  c.run('electro.create', { typeId: electroTypeId(key), wallId: wallNear(c, p), point: p, ...extra })[0] ??
  '';

/** Elektro prvek na strop / do místnosti. */
export const onCeiling = (c: SampleContext, key: string, p: Vec2, extra: Record<string, unknown> = {}) =>
  c.run('electro.create', { typeId: electroTypeId(key), storeyId: c.storeyId, point: p, ...extra })[0] ?? '';

/** Pohled ukázky ve stylu Elektro (1:50). */
export function electroView(c: SampleContext) {
  const style = Object.values(c.model.display.styles).find((s) => s.name === 'Elektro');
  c.run('view.setStyle', { viewId: c.viewId, styleId: style?.id });
  c.run('view.setScale', { viewId: c.viewId, scale: 50 });
}
