// Vlastnosti stěny (plán stěn Z7): funkce, nosnost, poloha, požární odolnost, akustika.
// Výchozí hodnoty nese typ (jako Revit: Function, Fire Rating); instance je může přepsat (jako
// Structural Usage v Revitu nebo Position v Archicadu). IFC: Pset_WallCommon, PredefinedType.

/** Funkce stěny (Revit Function + příčka podle plánu stěn). */
export type WallFunction = 'exterior' | 'interior' | 'partition' | 'foundation' | 'retaining';
export const WALL_FUNCTIONS: readonly WallFunction[] = [
  'exterior',
  'interior',
  'partition',
  'foundation',
  'retaining',
];

export interface WallProperties {
  readonly function: WallFunction;
  /** Nosná stěna (IFC LoadBearing). */
  readonly loadBearing: boolean;
  /** Vnější stěna – odděluje vnitřek od venku (IFC IsExternal). */
  readonly isExternal: boolean;
  /** Požární odolnost, volný text (např. „REI 60 DP1“). */
  readonly fireRating: string;
  /** Akustika – vzduchová neprůzvučnost, volný text (např. „R'w 52 dB“). */
  readonly acousticRating: string;
}

export type WallPropertyKey = keyof WallProperties;

/** Přepisy instance: chybějící klíč = podle typu. */
export type WallPropertyOverrides = Partial<WallProperties>;

export const DEFAULT_WALL_PROPERTIES: WallProperties = {
  function: 'interior',
  loadBearing: false,
  isExternal: false,
  fireRating: '',
  acousticRating: '',
};
