// 3D pohled (požadavek 3D náhledu; Revit „3D pohled“ s Section Boxem, Archicad 3D s „Filter and Cut
// Elements in 3D“): uložený v projektu, s názvem, víc instancí. Grafika jako u půdorysu – styl, vrstvy,
// filtr rekonstrukce, přepisy (základ 26) – plus rozsah podlaží a ořezový kvádr.
import type { Id } from '../ids/index.ts';
import type { GraphicView } from '../view/types.ts';

/** Kvádr v osách modelu (mm, z nad ±0,000); zatím bez natočení. */
export interface Box3 {
  readonly min: { readonly x: number; readonly y: number; readonly z: number };
  readonly max: { readonly x: number; readonly y: number; readonly z: number };
}

export interface View3d extends GraphicView {
  readonly id: Id;
  /** Zobrazená podlaží; null = všechna. */
  readonly storeyIds: readonly Id[] | null;
  /** Ořezový kvádr; null = vypnutý. */
  readonly sectionBox: Box3 | null;
}

/** Nový 3D pohled se stylem: všechna podlaží, bez ořezu, bez místních úprav. */
export const newView3d = (id: Id, name: string, styleId: Id): View3d => ({
  id,
  name,
  styleId,
  local: {},
  elementOverrides: {},
  phaseFilterId: null,
  storeyIds: null,
  sectionBox: null,
});
