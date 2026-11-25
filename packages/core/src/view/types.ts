// Pohled (základ 26): podlaží + výřez + měřítko + styl (+ označené místní úpravy).
import type { Vec2 } from '../geometry/index.ts';
import type { Id } from '../ids/index.ts';
import type { CategoryGraphics, Detail, GraphicEffect, LayerState } from '../style/types.ts';

/** Místní úpravy pohledu oproti stylu; prázdné = „styl beze změn“. */
export interface ViewLocalOverrides {
  readonly layerStates?: Readonly<Record<Id, LayerState>>;
  readonly detail?: Detail;
  readonly overrideCombinationId?: Id;
  /** Úprava grafiky podle kategorie (patro 4). */
  readonly categoryGraphics?: CategoryGraphics;
}

export interface View {
  readonly id: Id;
  readonly name: string;
  readonly storeyId: Id;
  /** Výřez v mm modelu; null = celé podlaží. */
  readonly crop: { readonly min: Vec2; readonly max: Vec2 } | null;
  /** Měřítko (jmenovatel: 50 = 1:50). Mění jen tloušťky čar (základ 29). */
  readonly scale: number;
  readonly styleId: Id;
  readonly local: ViewLocalOverrides;
  /** Aktivní skupina anotací; null = výchozí podle stylu. */
  readonly activeAnnotationLayerId: Id | null;
  /** Rovina řezu půdorysu nad úrovní podlaží (mm, výchozí 1000; plán stěn Z4, Z6). */
  readonly cutPlane: number;
  /** Přepis prvku „jen v tomto pohledu“ (patro 6). */
  readonly elementOverrides: Readonly<Record<Id, GraphicEffect>>;
  /**
   * Uložený pohled (jde na výkresy, má pevné nastavení), nebo pracovní okno podlaží (false; jedno na
   * podlaží, nastavení se mění volně – koncepce rozhraní, část 4).
   */
  readonly saved: boolean;
}
