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
  /**
   * Čára řezu v půdorysu (mm modelu): 2 body = rovný řez, víc bodů = zalomený řez (úseky rovnoběžné
   * s prvním řežou, kolmé jsou zalomení; první i poslední úsek řeže).
   */
  readonly points: readonly Vec2[];
  readonly direction: SectionDirection;
  /** Hloubka pohledu za rovinou (mm); null = bez omezení (do konce modelu). Styl řezu ji přepíše. */
  readonly depth: number | null;
  /** Vzdálená oblast od (mm za rovinou): dál se kreslí grafikou vzdálené oblasti; null = vypnuto. */
  readonly farClip: number | null;
  /** Styl řezu (pojmenovaná předvolba hloubky a vzdálené oblasti); null = vlastní hodnoty. */
  readonly presetId: Id | null;
  readonly range: SectionRange | null;
  /** Měřítko (jmenovatel); mění jen tloušťky čar (základ 29). */
  readonly scale: number;
  /** Skupina anotací značky řezu v půdorysu (základ 28). */
  readonly annotationLayerId: Id;
  /**
   * Automatický pohled kolem budovy (základ 16): čáru po každém příkazu přepočítá obálka budovy;
   * `locked` = uživatel čáru posunul, přepočet ji nechá být. Chybí = ruční řez / pohled.
   */
  readonly auto?: { readonly locked: boolean };
}

/** Automatické pohledy kolem budovy (Revit: 4 pohledy v šabloně projektu). */
export interface ElevationsAround {
  /** Odstup čar od obálky budovy (mm). */
  readonly margin: number;
  /** Označení smazaných automatických pohledů – znovu se samy nevytvoří (elevation.create je obnoví). */
  readonly removed: readonly string[];
}

/** Styl řezu (Ardit „Styl“ u nástroje Řez): nastavení sdílené více řezy. */
export interface SectionPreset {
  readonly id: Id;
  readonly name: string;
  readonly depth: number | null;
  readonly farClip: number | null;
}

/** Hloubka a vzdálená oblast řezu: ze stylu řezu, nebo vlastní. */
export function sectionLimits(
  presets: Readonly<Record<Id, SectionPreset>>,
  s: Pick<Section, 'presetId' | 'depth' | 'farClip'>,
): { depth: number | null; farClip: number | null } {
  const p = s.presetId ? presets[s.presetId] : undefined;
  return p ? { depth: p.depth, farClip: p.farClip } : { depth: s.depth, farClip: s.farClip };
}

/** Výchozí styly řezu nového projektu (vymyšlené předvolby). */
export const SECTION_PRESET_LIBRARY: readonly Omit<SectionPreset, 'id'>[] = [
  { name: 'Řez – celá hloubka', depth: null, farClip: null },
  { name: 'Řez – 6 m, vzdálená oblast od 3 m', depth: 6000, farClip: 3000 },
];
/** Výchozí měřítko řezu a pohledu (DPS 1:100). */
export const DEFAULT_SECTION_SCALE = 100;

/** Další volné písmeno řezu (A, B, … Z, AA…). */
export function nextSectionMark(used: readonly string[]): string {
  for (let i = 0; ; i++) {
    const mark = letters(i);
    if (!used.includes(mark)) return mark;
  }
}

/** Další volné číslo pohledu (1, 2, 3…). */
export function nextElevationMark(used: readonly string[]): string {
  for (let i = 1; ; i++) if (!used.includes(String(i))) return String(i);
}

function letters(i: number): string {
  const a = String.fromCharCode(65 + (i % 26));
  return i < 26 ? a : letters(Math.floor(i / 26) - 1) + a;
}
