// Společné typy interakce sandboxu (základ 20: přichytávání, tracker, kóty a výběr jsou jedna služba).
import type { Dimension, Id, Model, Vec2, WallEdge } from '@bim-light/core';

/** Událost myši: bod na obrazovce (px) i v modelu (mm) a modifikátory. */
export interface PointerInfo {
  readonly screen: Vec2;
  readonly world: Vec2;
  /** 0 levé, 1 prostřední, 2 pravé tlačítko. */
  readonly button: number;
  readonly shift: boolean;
  readonly ctrl: boolean;
  readonly alt: boolean;
}

export interface KeyInfo {
  readonly key: string;
  readonly shift: boolean;
  readonly ctrl: boolean;
  readonly alt: boolean;
}

export type ToolId =
  | 'select'
  | 'wall'
  | 'dimension'
  | 'angle'
  | 'move'
  | 'copy'
  | 'rotate'
  | 'mirror'
  | 'array'
  | 'align'
  | 'trim'
  | 'split'
  | 'rect'
  | 'zoomwin'
  | 'paste'
  | 'pickline'
  | 'opening'
  | 'arc';

/** Co nástroj kreslí přes výkres (světle modré pomocné značky, katalog kreslení 2). */
export interface Overlay {
  /** Tečkované pomocné čáry (mm). */
  readonly guides?: readonly (readonly [Vec2, Vec2])[];
  /** Značka přichycení s popiskem. */
  readonly snap?: { readonly point: Vec2; readonly label: string } | null;
  /** Náhled stěn (obrysy v mm). */
  readonly ghosts?: readonly (readonly Vec2[])[];
  /** Pomocné úsečky (osa zrcadlení, směr otočení…). */
  readonly lines?: readonly (readonly [Vec2, Vec2])[];
  /** Základní body příkazů. */
  readonly markers?: readonly Vec2[];
  /** Kóty nesené na myši (ještě nejsou v modelu). */
  readonly draftDims?: readonly Dimension[];
  /** Kóty, které se právě táhnou (kreslí se jen jejich náhled). */
  readonly hiddenDims?: readonly Id[];
  /** Zvýrazněný líc (nástroj Kóta, Zarovnat). */
  readonly faces?: readonly { readonly wallId: Id; readonly face: WallEdge }[];
  /** Stěny zvýrazněné pod kurzorem. */
  readonly hover?: readonly Id[];
  /** Model po rozpracované změně (tažení uzlu): kreslí se místo skutečného, nic se neukládá. */
  readonly previewModel?: Model | null;
  /** Rámeček výběru v px. */
  readonly box?: { readonly a: Vec2; readonly b: Vec2; readonly crossing: boolean } | null;
}

export interface TrackerField {
  readonly label: string;
  readonly value: string;
  readonly active: boolean;
}

/** Nástroj = jeden modul interakce (kreslení, kóty, příkazy…). */
export interface Tool {
  readonly id: ToolId;
  hint(): string;
  down(p: PointerInfo): void;
  move(p: PointerInfo): void;
  up(p: PointerInfo): void;
  dblclick?(p: PointerInfo): void;
  /** Vrací true, když klávesu zpracoval. */
  key(k: KeyInfo): boolean;
  /** Esc: true = nástroj zůstává (zrušil krok), false = návrat k výběru. */
  escape(): boolean;
  overlay(): Overlay;
  tracker(): readonly TrackerField[] | null;
  /** Prvek pod kurzorem pro kartu prvku (koncepce rozhraní 2 I); nástroj bez karty ho nemá. */
  hoverId?(): string | null;
}

export const EMPTY_OVERLAY: Overlay = {};
