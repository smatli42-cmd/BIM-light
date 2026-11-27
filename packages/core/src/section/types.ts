// Řez a pohled (fasáda) jako druh pohledu v projektu (rozhodnutí 19, základ 26; Revit Section / Elevation,
// Archicad Section / Elevation). Čára v půdorysu (2 body), směr pohledu, hloubka pohledu a rozsah výšky;
// grafika jako u půdorysu – styl, místní úpravy, filtr rekonstrukce, přepisy prvků. Řez prořízne konstrukce
// rovinou nad čárou, pohled (fasáda) nic neprořízne a kreslí jen pohledové hrany. Nic se neukládá jako kresba.
import type { Vec2 } from '../geometry/index.ts';
import type { Id } from '../ids/index.ts';
import type { GraphicView } from '../view/types.ts';

/** Řez (prořízne konstrukce), nebo pohled / fasáda (jen pohledové hrany). */
export type SectionKind = 'section' | 'elevation';
export const SECTION_KINDS: readonly SectionKind[] = ['section', 'elevation'];

/** Kam se díváme od čáry: doleva, nebo doprava od směru start → end. */
export type SectionDirection = 'left' | 'right';
export const SECTION_DIRECTIONS: readonly SectionDirection[] = ['left', 'right'];

/** Rozsah výšky kresby (mm nad ±0,000); null = celá budova. */
export interface SectionRange {
  readonly bottom: number;
  readonly top: number;
}

export interface Section extends GraphicView {
  readonly id: Id;
  readonly kind: SectionKind;
  readonly name: string;
  /** Označení ve značce řezu (A, B…) nebo číslo pohledu (1–4). */
  readonly mark: string;
  /** Čára řezu v půdorysu (mm modelu). */
  readonly start: Vec2;
  readonly end: Vec2;
  readonly direction: SectionDirection;
  /** Hloubka pohledu za rovinou (mm); null = bez omezení (do konce modelu). */
  readonly depth: number | null;
  readonly range: SectionRange | null;
  /** Měřítko (jmenovatel); mění jen tloušťky čar (základ 29). */
  readonly scale: number;
  /** Skupina anotací značky řezu v půdorysu (základ 28). */
  readonly annotationLayerId: Id;
}

/** Výchozí hloubka pohledu řezu (mm): běžný rodinný dům celý. */
export const DEFAULT_SECTION_DEPTH = 15000;
/** Výchozí měřítko řezu a pohledu (DPS 1:100). */
export const DEFAULT_SECTION_SCALE = 100;

/** Další volné písmeno řezu (A, B, … Z, AA…). */
export function nextSectionMark(used: readonly string[]): string {
  for (let i = 0; ; i++) {
    const mark = letters(i);
    if (!used.includes(mark)) return mark;
  }
}

function letters(i: number): string {
  const a = String.fromCharCode(65 + (i % 26));
  return i < 26 ? a : letters(Math.floor(i / 26) - 1) + a;
}
