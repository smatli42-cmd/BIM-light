// 3D pohled (požadavek 3D náhledu; Revit „3D pohled“ s Section Boxem, Archicad 3D s „Filter and Cut
// Elements in 3D“, lišta 3D okna podle Ardit Designeru): uložený v projektu, s názvem, víc instancí. Grafika
// jako u půdorysu – styl, vrstvy, filtr rekonstrukce, přepisy (základ 26) – plus rozsah podlaží, ořezový
// kvádr, projekce, režim zobrazení, slunce a stíny, rovina řezu a mřížka.
import type { Id } from '../ids/index.ts';
import type { GraphicView } from '../view/types.ts';

export interface Point3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/** Kvádr v osách modelu (mm, z nad ±0,000); zatím bez natočení. */
export interface Box3 {
  readonly min: Point3;
  readonly max: Point3;
}

/** Perspektiva, nebo axonometrie (rovnoběžné promítání). */
export type Projection3d = 'perspective' | 'axonometric';
export const PROJECTIONS: readonly Projection3d[] = ['perspective', 'axonometric'];

/** Režim zobrazení: materiály, bílý model, čárový (drátový), skryté hrany, skica. */
export type RenderMode3d = 'materials' | 'white' | 'wireframe' | 'hidden-lines' | 'sketch';
export const RENDER_MODES: readonly RenderMode3d[] = [
  'materials',
  'white',
  'wireframe',
  'hidden-lines',
  'sketch',
];

/**
 * Slunce: `manual` = azimut (° od severu po směru hodin) a výška nad obzorem (°), `time` = poloha podle
 * data a místního času v místě stavby (georeference). `shadows` = vrhat stíny.
 */
export interface Sun3d {
  readonly shadows: boolean;
  readonly mode: 'manual' | 'time';
  readonly azimuth: number;
  readonly altitude: number;
  /** RRRR-MM-DD */
  readonly date: string;
  /** HH:MM, místní čas (SEČ / SELČ) */
  readonly time: string;
}

/** Rovina řezu ve 3D: zůstane část ve směru `normal` od bodu `origin` (mm); řezné plochy bez výplně. */
export interface CutPlane3d {
  readonly origin: Point3;
  readonly normal: Point3;
}

export interface View3d extends GraphicView {
  readonly id: Id;
  /** Zobrazená podlaží; null = všechna. */
  readonly storeyIds: readonly Id[] | null;
  /** Ořezový kvádr; null = vypnutý. */
  readonly sectionBox: Box3 | null;
  readonly projection: Projection3d;
  readonly renderMode: RenderMode3d;
  readonly sun: Sun3d;
  /** Rovina řezu; null = bez 3D řezu. */
  readonly cutPlane: CutPlane3d | null;
  /** Mřížka v pracovní rovině (úroveň aktivního podlaží). */
  readonly grid: boolean;
}

export const DEFAULT_SUN: Sun3d = {
  shadows: false,
  mode: 'manual',
  azimuth: 225,
  altitude: 40,
  date: '2026-06-21',
  time: '14:00',
};

/** Výchozí vzhled nového 3D pohledu (i migrace starších projektů). */
export const VIEW3D_LOOK = {
  projection: 'perspective',
  renderMode: 'materials',
  sun: DEFAULT_SUN,
  cutPlane: null,
  grid: false,
} as const satisfies Pick<View3d, 'projection' | 'renderMode' | 'sun' | 'cutPlane' | 'grid'>;

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
  ...VIEW3D_LOOK,
});
