// Šrafa jako samostatná položka knihovny (základ 34): jen tvar, žádná barva. Materiál ji odkazuje.
// Všechny rozměry jsou v mm NA PAPÍŘE (stejné ve všech měřítcích, základ 29), úhly ve stupních
// vůči výkresu. Počátek rastru je společný v souřadnicích modelu (sousední stěny na sebe navazují).
import type { LibraryRef } from '../model/types.ts';

/** Rodina rovnoběžných čar (jako řádek .pat v AutoCADu). */
export interface LineFamily {
  readonly kind: 'lines';
  readonly angle: number;
  /** Rozteč čar (mm na papíře). */
  readonly spacing: number;
  /** Posun čar po jejich směru (mm), pro navazování čárkování. */
  readonly offset: number;
  /** Čárkování: střídavě čára / mezera (mm); prázdné = plná čára. */
  readonly dash: readonly number[];
  /** Posun celé rodiny kolmo na čáry (mm); střídání dvou rodin se stejnou roztečí. */
  readonly shift?: number;
}

export type MarkShape = 'dot' | 'circle' | 'triangle' | 'cross' | 'arrow' | 'hexagon';

/** Rodina značek v pravidelném rastru (tečky, kroužky, trojúhelníky…). */
export interface MarkFamily {
  readonly kind: 'marks';
  readonly shape: MarkShape;
  /** Velikost značky (mm). */
  readonly size: number;
  /** Rozteč ve směru x a y rastru (mm). */
  readonly dx: number;
  readonly dy: number;
  /** Posun každé druhé řady ve směru x (mm). */
  readonly rowShift: number;
  readonly angle: number;
}

/** Rodina vlnovek (sinus) nebo cik-caku. */
export interface WaveFamily {
  readonly kind: 'wave';
  readonly form: 'sine' | 'zigzag';
  readonly amplitude: number;
  readonly wavelength: number;
  /** Rozteč řad (mm). */
  readonly spacing: number;
  readonly angle: number;
}

/** Jedna křivka motivu: body v mm na papíře vůči středu motivu. */
export interface MotifCurve {
  readonly points: readonly { readonly x: number; readonly y: number }[];
  /** Uzavřená (poslední bod se spojí s prvním). */
  readonly closed: boolean;
  /** Vyhlazená (oblá křivka přes body) místo lomené čáry. */
  readonly smooth: boolean;
}

/**
 * Motiv: jedna nebo více křivek (lomených nebo vyhlazených, otevřených nebo uzavřených) opakovaných
 * v rastru s roztečí dx, dy, posunem každé druhé řady a úhlem (láhve tepelné izolace, „<“ dřeva…).
 */
export interface MotifFamily {
  readonly kind: 'motif';
  readonly curves: readonly MotifCurve[];
  readonly dx: number;
  readonly dy: number;
  readonly rowShift: number;
  readonly angle: number;
}

/**
 * Pás přes celou šířku vrstvy (tepelná izolace, „vata“ jako v Revitu / Archicadu): souvislá smyčková
 * křivka podél osy stěny, na jednom líci očka, na druhém oblouky. Rozměry jsou poměry k šířce vrstvy,
 * takže se šrafa přizpůsobí každé tloušťce; měřítko šraf stylu ji nemění.
 */
export interface BandFamily {
  readonly kind: 'band';
  readonly form: 'coil';
  /** Délka jedné smyčky podél stěny / šířka vrstvy. */
  readonly pitch: number;
  /** Hloubka očka od líce / šířka vrstvy (0..1). */
  readonly loop: number;
}

export type HatchFamily = LineFamily | MarkFamily | WaveFamily | MotifFamily | BandFamily;

export type HatchGroup = 'zeminy' | 'beton' | 'zdivo' | 'izolace' | 'drevo-kov-sklo' | 'ostatni';

export interface Hatch {
  /** Stabilní ascii slug, např. „hatch.zdivo-mrizka“. */
  readonly id: string;
  /** Název česky (pořadí a jména podle seznamu v katalogu šraf). */
  readonly name: string;
  readonly group: HatchGroup;
  /** Pořadí v knihovně (1 = první). */
  readonly order: number;
  /** Odvozená šrafa: varianta jiné šrafy (jen odkaz, žádný zvláštní druh). */
  readonly variantOf?: string;
  /** Odvozené grafické označení (ČSN 01 3420 „odvozené“), jinak základní. */
  readonly derived: boolean;
  /** Plná výplň barvou čar (vyčerněná izolace proti vodě). */
  readonly solid?: boolean;
  readonly families: readonly HatchFamily[];
  readonly version: number;
  /** Kopie v projektu: odkud pochází (základ 21). */
  readonly source?: LibraryRef;
}

/** Pomocníci pro zápis dat knihovny. */
export const lines = (
  angle: number,
  spacing: number,
  dash: number[] = [],
  offset = 0,
  shift = 0,
): LineFamily => ({ kind: 'lines', angle, spacing, offset, dash, ...(shift ? { shift } : {}) });

export const marks = (
  shape: MarkShape,
  size: number,
  dx: number,
  dy = dx,
  rowShift = dx / 2,
  angle = 0,
): MarkFamily => ({ kind: 'marks', shape, size, dx, dy, rowShift, angle });

export const wave = (
  form: 'sine' | 'zigzag',
  amplitude: number,
  wavelength: number,
  spacing: number,
  angle = 0,
): WaveFamily => ({ kind: 'wave', form, amplitude, wavelength, spacing, angle });

type Pt = readonly [number, number];
const curve = (pts: readonly Pt[], closed: boolean, smooth: boolean): MotifCurve => ({
  points: pts.map(([x, y]) => ({ x, y })),
  closed,
  smooth,
});
/** Lomená čára motivu (otevřená). */
export const polyline = (...pts: Pt[]): MotifCurve => curve(pts, false, false);
/** Lomený uzavřený obrys motivu. */
export const polygon = (...pts: Pt[]): MotifCurve => curve(pts, true, false);
/** Vyhlazená křivka motivu (otevřená, nebo uzavřená smyčka). */
export const smooth = (closed: boolean, ...pts: Pt[]): MotifCurve => curve(pts, closed, true);

export const motif = (curves: MotifCurve[], dx: number, dy = dx, rowShift = 0, angle = 0): MotifFamily => ({
  kind: 'motif',
  curves,
  dx,
  dy,
  rowShift,
  angle,
});

export const band = (pitch: number, loop: number): BandFamily => ({
  kind: 'band',
  form: 'coil',
  pitch,
  loop,
});

/** Záznam knihovny ve skupině (pořadí, id, název, zbytek). */
export const entry =
  (group: HatchGroup) =>
  (order: number, id: string, name: string, rest: Partial<Hatch> = {}): Hatch => ({
    id,
    name,
    group,
    order,
    version: 3,
    derived: !!rest.variantOf,
    families: [],
    ...rest,
  });
