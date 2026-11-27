// Půdorys otvoru (základ 19): obdélník po stěně přes tloušťku (u oblouku výseč po 16 dílcích), u niky jen
// do hloubky. Společný pro 3D tělesa (výřez) i řez (otvor v řezané stěně). Počítá se z modelu, neukládá se.
import type { Vec2 } from '../geometry/index.ts';
import type { Model } from '../model/types.ts';
import type { Wall } from '../wall/types.ts';
import { pointAtStation } from './along.ts';
import { openingAcross } from './edges.ts';
import { openingSpan } from './geometry.ts';
import type { Opening } from './types.ts';

/** Přesah půdorysu otvoru přes líc, aby výřez nenechal tenkou blánu (jako v IFC). */
export const OPENING_OVER = 1;

/** `over` = přesah přes líc (výřez), 0 = přesně v lících (záplata rekonstrukce). */
export function openingFootprint(model: Model, o: Opening, host: Wall, over = OPENING_OVER): Vec2[] {
  const { s0, s1 } = openingSpan(o);
  const [a, b] = openingAcross(model, o);
  const overA = Math.sign(a - b) * over;
  const overB = o.kind === 'niche' ? 0 : Math.sign(b - a) * over;
  const lo = Math.min(a + overA, b + overB);
  const hi = Math.max(a + overA, b + overB);
  const n = host.path.kind === 'arc' && Math.abs(host.path.bulge) > 1e-9 ? 16 : 1;
  const st = Array.from({ length: n + 1 }, (_, i) => s0 + ((s1 - s0) * i) / n);
  return [
    ...st.map((s) => pointAtStation(host.path, s, lo)),
    ...[...st].reverse().map((s) => pointAtStation(host.path, s, hi)),
  ];
}
