// Kontrola otvoru proti hostiteli (plán stěn Z4): otvor musí ležet celý ve stěně – po délce i na výšku,
// nika musí být mělčí než stěna a otvory se nepřekrývají. Změnu, která by to porušila, editor odmítne
// a řekne proč (nikdy tiše, jako u zámků kót).
import type { Id } from '../ids/index.ts';
import { resolveHeight } from '../model/height.ts';
import type { Model } from '../model/types.ts';
import { wallSection } from '../wall/queries.ts';
import type { Wall } from '../wall/types.ts';
import { hostLength, openingsOf, openingSpan } from './geometry.ts';
import type { Opening } from './types.ts';

const TOL = 0.5;
const mm = (n: number) => `${Math.round(n)} mm`;

function hostOf(model: Model, o: Opening): Wall | null {
  const el = model.elements[o.hostId];
  return el && el.category === 'wall' ? el : null;
}

function overlaps(a: Opening, b: Opening): boolean {
  const sa = openingSpan(a);
  const sb = openingSpan(b);
  const along = Math.min(sa.s1, sb.s1) - Math.max(sa.s0, sb.s0) > TOL;
  const up = Math.min(a.sill + a.height, b.sill + b.height) - Math.max(a.sill, b.sill) > TOL;
  return along && up;
}

/** Proč otvor ve stěně nemůže být, nebo null. */
export function openingProblem(model: Model, o: Opening): string | null {
  const host = hostOf(model, o);
  if (!host) return 'Hostitelská stěna otvoru neexistuje';
  if (!(o.width > 0) || !(o.height > 0)) return 'Šířka i výška otvoru musí být kladné';
  const len = hostLength(host);
  const { s0, s1 } = openingSpan(o);
  if (s0 < -TOL || s1 > len + TOL)
    return `Otvor by vyčníval ze stěny (stěna má ${mm(len)}, otvor leží od ${mm(s0)} do ${mm(s1)})`;
  const h = resolveHeight(model, host.height);
  const wallHeight = h.top - h.bottom;
  if (o.sill < -TOL) return 'Parapet otvoru nesmí být pod spodkem stěny';
  if (o.sill + o.height > wallHeight + TOL)
    return `Otvor by přesáhl výšku stěny (${mm(wallHeight)}): parapet ${mm(o.sill)} + výška ${mm(o.height)}`;
  if (o.kind === 'niche') {
    const t = wallSection(model, host).thickness;
    if (!(o.depth > 0) || o.depth >= t - TOL)
      return `Hloubka niky musí být větší než 0 a menší než tloušťka stěny (${mm(t)})`;
  }
  const other = openingsOf(model, host.id).find((x) => x.id !== o.id && overlaps(o, x));
  if (other) return 'Otvor se překrývá s jiným otvorem ve stejné stěně';
  return null;
}

export interface OpeningViolation {
  readonly openingId: Id;
  readonly message: string;
}

/**
 * Otvory, které po změně modelu nejsou v pořádku, ač předtím byly (nebo jsou nové).
 * Starý problém, který změna nezpůsobila, změnu neblokuje.
 */
export function openingViolations(before: Model, after: Model): OpeningViolation[] {
  const out: OpeningViolation[] = [];
  const same = before.storeys === after.storeys && before.wallTypes === after.wallTypes;
  for (const o of Object.values(after.openings)) {
    if (same && before.openings[o.id] === o && before.elements[o.hostId] === after.elements[o.hostId])
      continue;
    const message = openingProblem(after, o);
    if (!message) continue;
    const old = before.openings[o.id];
    if (old && hostOf(before, old) && openingProblem(before, old)) continue;
    out.push({ openingId: o.id, message });
  }
  return out;
}

/** Vysvětlení pro uživatele. */
export const describeOpeningViolation = (v: OpeningViolation): string =>
  `Změna se neprovedla: ${v.message.charAt(0).toLowerCase()}${v.message.slice(1)}.`;
