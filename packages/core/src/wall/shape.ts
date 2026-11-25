// Kontrola tvaru obloukové stěny (Z5): vnitřní líc musí mít kladný poloměr (poloměr osy větší než
// tloušťka na vnitřní straně) a oblouk nejvýš 350° (kruh se skládá aspoň ze dvou stěn). Editor změnu,
// která by to porušila, odmítne s vysvětlením.
import { arcData } from '../geometry/index.ts';
import type { Model } from '../model/types.ts';
import { allWalls, wallSection } from './queries.ts';
import type { Wall } from './types.ts';

/** Nejmenší poloměr líce (mm). */
const MIN_RADIUS = 10;
const MAX_SWEEP = (350 * Math.PI) / 180;

/** Proč tvar stěny nejde, nebo null. */
export function wallShapeProblem(model: Model, w: Wall): string | null {
  const p = w.path;
  if (p.kind !== 'arc' || Math.abs(p.bulge) < 1e-9) return null;
  const a = arcData(p);
  if (Math.abs(a.sweep) > MAX_SWEEP) return 'Oblouk stěny smí mít nejvýš 350° (kruh nakreslete ze dvou stěn)';
  const s = wallSection(model, w);
  const offsets = s.layers.flatMap((l) => [l.from, l.to]);
  const sign = a.sweep > 0 ? 1 : -1;
  const inner = Math.min(...offsets.map((o) => a.radius - sign * o));
  if (inner < MIN_RADIUS)
    return `Poloměr oblouku (${Math.round(a.radius)} mm) je na vnitřní straně menší než tloušťka stěny`;
  return null;
}

/** Stěny, které po změně mají nepovolený tvar (jen změněné stěny). */
export function wallShapeViolation(before: Model, after: Model): string | null {
  for (const w of allWalls(after)) {
    if (before.elements[w.id] === w && before.wallTypes === after.wallTypes) continue;
    const msg = wallShapeProblem(after, w);
    if (msg) return `Změna se neprovedla: ${msg.charAt(0).toLowerCase()}${msg.slice(1)}.`;
  }
  return null;
}
