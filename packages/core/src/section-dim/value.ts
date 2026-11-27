// Souřadnice odkazu kóty v řezu z modelu: úroveň → z (levelZ), bok prvku → u z obsahu řezu (řezaný prvek
// má přednost před prvkem v pohledu). Kam jde kótu přichytit: úrovně (výškové kóty) a boky prvků.
import type { Id } from '../ids/index.ts';
import { levelZ } from '../level-dim/value.ts';
import type { Model } from '../model/types.ts';
import { sectionContent } from '../section/content.ts';
import type { Section } from '../section/types.ts';
import type { SectionDimRef, SideRef } from './types.ts';

type Content = ReturnType<typeof sectionContent>;
const cache = new WeakMap<Model, Map<Id, Content>>();

function content(model: Model, s: Section): Content {
  const byId = cache.get(model) ?? new Map<Id, Content>();
  cache.set(model, byId);
  const hit = byId.get(s.id);
  if (hit) return hit;
  const c = sectionContent(model, s);
  byId.set(s.id, c);
  return c;
}

/** Rozsah prvku po výkrese řezu (u0–u1); null = prvek v řezu není. */
function elementSpan(model: Model, s: Section, id: Id): { u0: number; u1: number } | null {
  const c = content(model, s);
  return c.cut.find((r) => r.elementId === id) ?? c.seen.find((r) => r.elementId === id) ?? null;
}

/** Souřadnice odkazu: z (úroveň) nebo u (bok prvku); null = odkaz neplatí. */
export function sectionRefCoord(model: Model, s: Section, ref: SectionDimRef): number | null {
  if (ref.kind !== 'side') return levelZ(model, ref);
  const span = elementSpan(model, s, ref.elementId);
  return span ? (ref.side === 'left' ? span.u0 : span.u1) : null;
}

export interface SideTarget {
  readonly ref: SideRef;
  readonly u: number;
  /** Výškový rozsah prvku (pro přichycení kurzoru k boku). */
  readonly z0: number;
  readonly z1: number;
}

/** Boky prvků v řezu, ke kterým jde vodorovná kóta (levý a pravý okraj každé stěny a desky). */
export function sideTargets(model: Model, s: Section): SideTarget[] {
  const c = content(model, s);
  const rows = [...c.cut, ...c.seen.filter((r) => !c.cut.some((x) => x.elementId === r.elementId))];
  return rows.flatMap((r) => {
    const top = levelZ(model, { kind: 'edge', elementId: r.elementId, edge: 'top' });
    const bottom = levelZ(model, { kind: 'edge', elementId: r.elementId, edge: 'bottom' });
    if (top === null || bottom === null) return [];
    return (['left', 'right'] as const).map((side) => ({
      ref: { kind: 'side', elementId: r.elementId, side } as SideRef,
      u: side === 'left' ? r.u0 : r.u1,
      z0: bottom,
      z1: top,
    }));
  });
}
