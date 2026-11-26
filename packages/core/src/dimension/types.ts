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
}

/** Vzdálenost mezi dvěma rovnoběžnými líci (příčná kóta). */
export interface LinearDimension extends DimensionBase {
  readonly kind: 'linear';
  readonly refs: readonly [FaceRef, FaceRef];
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
