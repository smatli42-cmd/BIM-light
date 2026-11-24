// Předvolby stylů Studie a Projekt (katalog pohledů: tabulka vzorů z arditu). Jsou to jen data.
// Studie: hrubě, tmavá výplň + světlý obrys, 1:100, vlastní skupina kót.
// Projekt: středně, vrstvy a šrafy materiálu, 1:50, kóty DSP a PPS + PPS.
import type { CategoryGraphics, Detail } from '../types.ts';

export interface StylePreset {
  readonly key: string;
  readonly name: string;
  readonly detail: Detail;
  readonly defaultScale: number;
  /** Viditelné anotační vrstvy (ostatní anotační skryté); modelové vrstvy jsou všechny viditelné. */
  readonly visibleAnnotations: readonly string[];
  readonly defaultAnnotationKey: string;
  readonly comboKey: string;
  readonly categoryGraphics: CategoryGraphics;
  readonly labels: Readonly<Record<string, boolean>>;
}

export const STYLE_PRESETS: readonly StylePreset[] = [
  {
    key: 'study',
    name: 'Studie',
    detail: 'coarse',
    defaultScale: 100,
    visibleAnnotations: ['drawing-2d', 'dims-study'],
    defaultAnnotationKey: 'dims-study',
    comboKey: 'none',
    categoryGraphics: { wall: { fillColor: '#3d3d3d', lineColor: '#8a8a8a', hatch: 'none' } },
    labels: { roomNumber: true, roomName: true, roomArea: true, elevations: false },
  },
  {
    key: 'project',
    name: 'Projekt',
    detail: 'medium',
    defaultScale: 50,
    visibleAnnotations: ['drawing-2d', 'dims-dsp', 'dims-pps'],
    defaultAnnotationKey: 'dims-dsp',
    comboKey: 'none',
    categoryGraphics: { wall: { fillColor: null, hatch: 'material' } },
    labels: { roomNumber: true, roomName: true, roomArea: true, elevations: true },
  },
];
