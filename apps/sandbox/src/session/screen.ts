// Volby zobrazení okna ze spodní lišty (koncepce rozhraní, část 2 G): nejsou data pohledu ani modelu,
// platí pro obrazovku tohoto uživatele (jako On-Screen View Options v Archicadu).
import type { Id, Structure } from '@bim-light/core';
import type { Viewport } from '../canvas/viewport.ts';

/** Okno pohledu: který pohled ukazuje a jeho výřez. */
import type { ViewTab } from './tabs.ts';

export interface WindowState {
  viewId: Id;
  readonly viewport: Viewport;
  /** Okno ukazuje řez / pohled (fasádu) místo půdorysu; null / chybí = půdorys `viewId`. */
  sectionId?: Id | null;
  /** Okno ukazuje výkaz / výpis (tabulku) místo půdorysu; přednost před řezem. */
  scheduleId?: Id | null;
  /** Záložky pohledů okna (session/tabs.ts); chybí = jen to, co okno ukazuje. */
  tabs?: ViewTab[];
}

export type TraceRef = 'below' | 'above' | Id;

export interface ScreenOptions {
  /** Přichytávání k bodům prvků (S). */
  snap: boolean;
  /** Pomocné prvky: vodicí čáry a body. */
  guides: boolean;
  /** Krok kurzoru mimo body prvků (mm); 0 = vypnuto. */
  step: number;
  /** Skutečná tloušťka čar (jinak vlasové). */
  trueWeight: boolean;
  /** Průchozí materiál: stejný materiál sousedních stěn bez dělicí čáry. */
  mergeMaterials: boolean;
  /** Izolovat popisy: model v polotónu a nevybíratelný. */
  isolate: boolean;
  /** Odhalit: skryté prvky purpurově a vybíratelné. */
  reveal: boolean;
  /** Konstrukční zobrazení: celá skladba, bez povrchů, jen jádro, jen jádro nosných (jen kresba). */
  structure: Structure;
  /** Karta prvku po podržení myši nad prvkem (vypínač ve spodní liště). */
  infoCards: boolean;
  /** Trasování: průsvitný odkaz jiného podlaží. */
  trace: { on: boolean; ref: TraceRef; intensity: 'weak' | 'mid' | 'strong'; over: boolean };
}

export const DEFAULT_SCREEN: ScreenOptions = {
  snap: true,
  guides: true,
  step: 0,
  trueWeight: true,
  mergeMaterials: true,
  isolate: false,
  reveal: false,
  infoCards: true,
  structure: 'all',
  trace: { on: false, ref: 'below', intensity: 'mid', over: false },
};

export const TRACE_ALPHA: Readonly<Record<ScreenOptions['trace']['intensity'], number>> = {
  weak: 0.15,
  mid: 0.3,
  strong: 0.5,
};

/** Volby obrazovky, které mění kresbu pohledu (drawView): průchozí materiál, konstrukční zobrazení. */
export const drawOptionsOf = (sc: ScreenOptions) => ({
  mergeMaterials: sc.mergeMaterials,
  structure: sc.structure,
});
