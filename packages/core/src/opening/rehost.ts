// Přesun otvoru do jiné stěny (rozdělení, sloučení, tažení na jinou stěnu): otvor dostane nového
// hostitele a polohu; kóty k jeho hranám se přepíší na nového hostitele (kóta jde s otvorem).
import { dot, tangentAt, type Path } from '../geometry/index.ts';
import type { Id } from '../ids/index.ts';
import type { Dimension, FaceRef } from '../dimension/types.ts';
import type { Model } from '../model/types.ts';
import { putDimensions, putOpenings } from '../model/update.ts';
import { lengthAt, stationAt } from './along.ts';
import type { Opening } from './types.ts';

/** Poloha otvoru převedená z jedné referenční čáry na jinou (počátek zůstane na místě ve světě). */
export function offsetOn(o: Opening, from: Path, to: Path): number {
  const p = stationAt(from, o.offset).point;
  const reversed = dot(tangentAt(from, 'start'), tangentAt(to, 'start')) < 0;
  return reversed ? lengthAt(to, p) - o.width : lengthAt(to, p);
}

function fixRef(r: FaceRef, hosts: ReadonlyMap<Id, Id>): FaceRef {
  const h = r.openingId && hosts.get(r.openingId);
  return h ? { ...r, wallId: h } : r;
}

/** Uloží otvory (s novým hostitelem) a přepíše kóty k jejich hranám. */
export function rehostOpenings(model: Model, moved: readonly Opening[]): Model {
  const hosts = new Map(moved.map((o) => [o.id, o.hostId]));
  const dims: Dimension[] = [];
  for (const d of Object.values(model.dimensions)) {
    if (d.kind === 'linear') {
      const refs: [FaceRef, FaceRef] = [fixRef(d.refs[0], hosts), fixRef(d.refs[1], hosts)];
      if (refs[0] !== d.refs[0] || refs[1] !== d.refs[1]) dims.push({ ...d, refs });
    } else if (d.kind === 'length') {
      const ref = fixRef(d.ref, hosts);
      if (ref !== d.ref) dims.push({ ...d, ref });
    }
  }
  return putDimensions(putOpenings(model, moved), dims);
}
