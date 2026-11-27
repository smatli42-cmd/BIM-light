// Otvor v desce (D3; základ 19, rozhodnutí prvky stavby 15): stejný druh prvku jako otvor ve stěně –
// IfcOpeningElement, kategorie „opening“ (vrstva, grafika, mazání), hostitel uložený odkazem. Řez je svislý
// (prostup, šachta, schodiště): obrys v půdorysu prořízne všechny desky v `hostIds` (nosnou i podlahu).
// Ukládá se zvlášť od otvorů ve stěně, protože poloha je obrys v půdorysu, ne staničení po stěně.
import type { Vec2 } from '../geometry/index.ts';
import type { Id } from '../ids/index.ts';
import type { Status, VariantRef } from '../model/types.ts';
import type { GraphicEffect } from '../style/types.ts';

export interface SlabOpening {
  readonly id: Id;
  readonly ifcClass: 'IfcOpeningElement';
  readonly category: 'opening';
  readonly discipline: string;
  readonly status: Status;
  readonly variant: VariantRef;
  readonly storeyId: Id;
  /** Desky, které otvor vyřízne (IfcRelVoidsElement ke každé). */
  readonly hostIds: readonly Id[];
  /** Obrys v půdorysu (mm), proti směru hodin, bez opakování prvního bodu. */
  readonly outline: readonly Vec2[];
  /** Přepis grafiky „ve všech pohledech“ (patro 5). */
  readonly graphicOverride?: GraphicEffect;
}
