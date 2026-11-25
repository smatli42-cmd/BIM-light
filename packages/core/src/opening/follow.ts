// Otvor jde se svou stěnou (plán stěn Z4, základ 25): po každém příkazu se poloha otvoru po stěně
// přepočítá podle toho, jak se změnila referenční čára hostitele.
// - Stěna se posunula / otočila / zrcadlila celá (délka stejná) nebo stojí její začátek: vzdálenost
//   od začátku zůstane, otvor jde se stěnou.
// - Pohnul se jen začátek (prodloužení, zkrácení): otvor zůstane na místě = drží vzdálenost od konce.
// - Jinak (změnila se délka i oba konce, např. odsazení s klouzáním konců): otvor zůstane na místě
//   ve světě – jeho počátek se promítne na novou referenční čáru.
import { dist, pathLength, type Path } from '../geometry/index.ts';
import type { Model } from '../model/types.ts';
import { putOpenings } from '../model/update.ts';
import { offsetOn } from './rehost.ts';
import type { Opening } from './types.ts';

const TOL = 1e-6;

function newOffset(o: Opening, before: Path, after: Path): number {
  const sameStart = dist(before.start, after.start) < TOL;
  const sameEnd = dist(before.end, after.end) < TOL;
  const lb = pathLength(before);
  const la = pathLength(after);
  if (sameStart || Math.abs(la - lb) < TOL) return o.offset;
  if (sameEnd) return la - (lb - o.offset);
  return offsetOn(o, before, after);
}

/** Přepočítá polohu otvorů, jejichž hostitel změnil referenční čáru. */
export function followOpenings(before: Model, after: Model): Model {
  const changed: Opening[] = [];
  for (const o of Object.values(after.openings)) {
    const a = after.elements[o.hostId];
    const b = before.elements[o.hostId];
    if (!a || !b || a.path === b.path || before.openings[o.id]?.hostId !== o.hostId) continue;
    const offset = newOffset(o, b.path, a.path);
    if (Math.abs(offset - o.offset) > 1e-9) changed.push({ ...o, offset });
  }
  return changed.length ? putOpenings(after, changed) : after;
}
