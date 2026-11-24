// Dílčí režim nástroje (tažení, posun uzlu, odsazení, umísťování kóty…).
// Nástroj mu předává události, dokud je `active`.
import type { KeyInfo, Overlay, PointerInfo, TrackerField } from './types.ts';

export interface Mode {
  readonly active: boolean;
  readonly hint?: string;
  move(p: PointerInfo): void;
  up(p: PointerInfo): void;
  /** Klik během režimu; true = zpracováno. */
  down(p: PointerInfo): boolean;
  key?(k: KeyInfo): boolean;
  escape(): void;
  overlay(): Overlay;
  tracker?(): readonly TrackerField[] | null;
}

/** Tažení začíná, až se myš pohne o víc než 4 px (klik bez tažení je klik). */
export const DRAG_PX = 4;
