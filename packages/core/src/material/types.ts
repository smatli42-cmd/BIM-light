// Materiál (základy 10, 34; katalog šraf a materiálů): jen základní vlastnosti. Šrafu jen odkazuje
// (šrafa je samostatná položka knihovny), barva je u materiálu. Tepelné vlastnosti, cena, GWP aj.
// zatím ne: přidají se novou verzí schématu s migrací a popisem parametru (základy 9, 15b).
import type { Id } from '../ids/index.ts';
import type { LibraryRef } from '../model/types.ts';

export const MATERIAL_CATEGORIES = [
  'Dřevo',
  'Zdivo',
  'Beton a potěry',
  'Izolace',
  'Omítky',
  'Kov',
  'Sklo',
  'Zemina a sypaniny',
  'Ostatní',
] as const;
export type MaterialCategory = (typeof MATERIAL_CATEGORIES)[number];

export interface Material {
  readonly id: Id;
  /** Název je klíč, na který se odkazují prvky a skladby (v projektu jedinečný). */
  readonly name: string;
  readonly category: MaterialCategory;
  /** Barva materiálu (3D); 2D barvy čar a výplně se z ní odvodí, pokud nejsou přepsané. */
  readonly color: string;
  /** Id šrafy v projektu (kopie z knihovny šraf). „bez šrafy“ je normální šrafa. */
  readonly hatchId: string;
  /** Pero čar šrafy (základ 32), výchozí 1. */
  readonly hatchPen: number;
  /** Přepsaná barva čar šrafy v 2D; null = odvodit z barvy. */
  readonly lineColor: string | null;
  /** Přepsaná barva výplně řezu v 2D; null = odvodit z barvy. */
  readonly fillColor: string | null;
  /** Průhledný ve 3D (jako sklo). */
  readonly transparent3D: boolean;
  /**
   * Úroveň priority spojování (id z `model.joinPriorities.levels`); null = podle kategorie. Úroveň výš
   * projede úroveň níž (join-priority/rank.ts).
   */
  readonly joinLevelId: Id | null;
  readonly note: string;
  readonly source?: LibraryRef;
}
