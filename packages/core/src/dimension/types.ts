// Trvalá kóta (pravidla-interakce: kóty; katalog kreslení, část 4).
// Kóta je samostatný objekt modelu: patří podlaží, má skupinu anotací (základ 28)
// a odkazuje se na líce konkrétních stěn, ne na souřadnice (základ 4).
import type { Id } from '../ids/index.ts';
import type { WallEdge } from '../wall/edges.ts';

/**
 * Odkaz na líc stěny nebo na čelo jejího volného konce ('start' / 'end'). S `openingId` je to hrana
 * otvoru v této stěně (plán stěn Z4): 'start' = počátek, 'end' = konec otvoru; `wallId` = hostitel.
 */
export interface FaceRef {
  readonly wallId: Id;
  readonly face: WallEdge;
  readonly openingId?: Id;
}

/**
 * Hrana nebo roh obrysu desky či otvoru v desce (desky D4; Revit kótuje hrany desky, Archicad i body).
 * Hrana `edge` = úsečka bod i → bod i + 1. Roh `vertex` se kótuje přímkou jím vedenou ve směru `dir`
 * (radiány) – rovnoběžnou s druhým kótovaným lícem, takže měří kolmou vzdálenost.
 */
export interface OutlineRef {
  readonly outline: 'slab' | 'slabOpening';
  readonly ownerId: Id;
  readonly edge?: number;
  readonly vertex?: number;
  readonly dir?: number;
}

/** Odkaz vzdálenostní kóty: líc stěny (hrana otvoru ve stěně), nebo hrana / roh obrysu desky. */
export type DimRef = FaceRef | OutlineRef;
export const isOutlineRef = (r: DimRef): r is OutlineRef => 'outline' in r;
/** Odkaz na stěnu (líc, čelo, hrana otvoru ve stěně), nebo null u hrany desky. */
export const wallRefOf = (r: DimRef): FaceRef | null => (isOutlineRef(r) ? null : r);
/** Prvek, který odkaz kóty hýbe: otvor, stěna, nebo deska / otvor v desce. */
export const refOwnerId = (r: DimRef): Id => (isOutlineRef(r) ? r.ownerId : (r.openingId ?? r.wallId));

interface DimensionBase {
  readonly id: Id;
  readonly storeyId: Id;
  /** Skupina anotací = anotační vrstva (viditelnost podle stylu). */
  readonly annotationLayerId: Id;
  /** Zámek je omezení modelu; platí i ve skryté skupině. Mění se jen výslovně. */
  readonly locked: boolean;
  /** Zamčená hodnota (mm nebo stupně); u odemčené kóty se nepoužívá. */
  readonly value: number;
  /** Přepsaný text kóty; null = skutečná hodnota. */
  readonly textOverride: string | null;
  /** Skupina zarovnání (kóty se hýbou spolu); není to skupina anotací. */
  readonly alignGroupId: Id | null;
  /**
   * Posun čísla po kótovací čáře od středu (mm modelu, + ve směru čáry); chybí = uprostřed. Číslo mimo
   * kótu (krátké kóty) – kótovací čára se pod ně prodlouží (pokyn uživatele 2026-11-27).
   */
  readonly textShift?: number;
}

/** Vzdálenost mezi dvěma rovnoběžnými líci (příčná kóta). */
export interface LinearDimension extends DimensionBase {
  readonly kind: 'linear';
  readonly refs: readonly [DimRef, DimRef];
  /** Index odkazu, jehož stěna se hýbe, když není nic vybráno (ta, z níž kóta vznikla). */
  readonly ownerRef: 0 | 1;
  /**
   * Poloha kótovací čáry: vzdálenost od středu prvního líce podél líce (mm). U kóty po oblouku
   * (`arc`) vzdálenost kótovací čáry od měřeného líce (+ = od středu oblouku).
   */
  readonly offset: number;
  /**
   * Kóta po oblouku (Z5): hrany přes obloukovou stěnu (čelo, hrana otvoru, líc napojené stěny) se měří
   * délkou oblouku na líci `face` stěny `wallId`.
   */
  readonly arc?: ArcMeasure;
}

export interface ArcMeasure {
  readonly wallId: Id;
  readonly face: 'ref' | 'opp';
}

/**
 * Co délková kóta měří (Z5): délku líce (u oblouku délku oblouku), tětivu oblouku, nebo poloměr líce.
 */
export type LengthMeasure = 'arc' | 'chord' | 'radius' | 'diameter';

/** Poloměr a průměr: kóta přes střed oblouku, odsazení = poloha po oblouku od středu líce (mm). */
export const isRadial = (m: LengthMeasure | undefined): boolean => m === 'radius' || m === 'diameter';

/** Délka líce stěny (podélná kóta); u oblouku i tětiva nebo poloměr. */
export interface LengthDimension extends DimensionBase {
  readonly kind: 'length';
  readonly ref: FaceRef;
  /** Chybí = 'arc' (délka líce). */
  readonly measure?: LengthMeasure;
  /** Odsazení kótovací čáry od líce (mm, kladné = vlevo od směru stěny). */
  readonly offset: number;
}

/** Úhel mezi dvěma stěnami (stupně). */
export interface AngularDimension extends DimensionBase {
  readonly kind: 'angular';
  readonly wallIds: readonly [Id, Id];
  readonly ownerRef: 0 | 1;
  /** Poloměr oblouku kóty (mm). */
  readonly radius: number;
}

export type Dimension = LinearDimension | LengthDimension | AngularDimension;

/** Tolerance zámků: 0,5 mm a 0,05° (prototyp, pravidla-interakce 9). */
export const LOCK_TOLERANCE = { length: 0.5, angle: 0.05 } as const;
