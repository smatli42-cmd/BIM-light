// Služba přichytávání (základ 20; katalog kreslení, část 2). Jedna pro kreslení, úpravy i příkazy.
import type { Vec2 } from '../geometry/index.ts';
import type { Id } from '../ids/index.ts';
import type { SnapKind } from '../rules/cross-rules.ts';
import type { WallFace } from '../wall/types.ts';

/**
 * Druh kandidáta; „kolmo“ je líc, na který se z výchozího bodu dopadá kolmo, „tečna“ je bod oblouku,
 * kde se ho dotkne přímka z výchozího bodu (Z5).
 */
export type SnapCandidateKind = SnapKind | 'perpendicular' | 'tangent';

export interface SnapCandidate {
  readonly point: Vec2;
  readonly kind: SnapCandidateKind;
  /** Popisek u kurzoru (česky). */
  readonly label: string;
  /** Pořadí priority (0 = nejvyšší), z tabulky průřezových pravidel (základ 7). */
  readonly priority: number;
  readonly wallId?: Id | undefined;
  readonly face?: WallFace | undefined;
}

export interface SnapOptions {
  /** Dosah přichycení v mm modelu (px / zvětšení). */
  readonly tolerance: number;
  /** Předchozí bod (řetěz stěn, základní bod příkazu). */
  readonly from?: Vec2 | null;
  /** Směr předchozí stěny v radiánech; úhlové kroky se berou vůči němu. */
  readonly prevDir?: number | null;
  /** Shift: drží jen 0° / 90°. */
  readonly orthoOnly?: boolean;
  /** Alt: přichytávání dočasně vypnuté. */
  readonly disabled?: boolean;
  /** Kolikátý kandidát (klávesa C střídá). */
  readonly cycle?: number;
  /** Rozteč mřížky v mm (katalog kreslení 2.6: zapíná se v nastavení); null / chybí = bez mřížky. */
  readonly grid?: number | null;
  /** Stěny, ke kterým se nepřichytává (právě se hýbou). */
  readonly exclude?: ReadonlySet<Id>;
}

export interface SnapInfo {
  readonly kind: SnapCandidateKind | 'angle' | 'guide' | 'grid';
  readonly label: string;
  /** Pořadí kandidáta a počet kandidátů (např. „konec 2/4“). */
  readonly index: number;
  readonly count: number;
  readonly wallId?: Id | undefined;
  readonly face?: WallFace | undefined;
}

export interface SnapResult {
  readonly point: Vec2;
  readonly snap: SnapInfo | null;
  /** Pomocné čáry (tečkované, světle modré). */
  readonly guides: readonly (readonly [Vec2, Vec2])[];
}

/** Délka bez přichycení se zaokrouhluje na 10 mm [R, katalog kreslení 2]. */
export const ROUND_STEP = 10;

/** Úhel, do kterého se směr přitáhne k úhlovému kroku (stupně). */
export const ANGLE_SNAP_DEG = 4;
