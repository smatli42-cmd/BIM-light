// Trvalá kóta (pravidla-interakce: kóty; katalog kreslení, část 4).
// Kóta je samostatný objekt modelu: patří podlaží, má skupinu anotací (základ 28)
// a odkazuje se na líce konkrétních stěn, ne na souřadnice (základ 4).
import type { Id } from '../ids/index.ts';
import type { WallFace } from '../wall/types.ts';

/** Odkaz na líc stěny. */
export interface FaceRef {
  readonly wallId: Id;
  readonly face: WallFace;
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
  /** Poloha kótovací čáry: vzdálenost od středu prvního líce podél líce (mm). */
  readonly offset: number;
}

/** Délka líce stěny (podélná kóta). */
export interface LengthDimension extends DimensionBase {
  readonly kind: 'length';
  readonly ref: FaceRef;
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
