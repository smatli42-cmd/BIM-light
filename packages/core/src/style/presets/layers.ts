// Výchozí vrstvy (podle panelu Vrstvy z arditu). Modelové vrstvy se plní podle kategorie,
// anotační vrstvy jsou skupiny anotací (základ 28). Klíče slouží jen pro sestavení předvoleb.
import type { Category } from '../../model/categories.ts';

export interface LayerPreset {
  readonly key: string;
  readonly name: string;
  readonly kind: 'category' | 'annotation';
  readonly categories: readonly Category[];
}

const cat = (key: string, name: string, categories: Category[]): LayerPreset => ({
  key,
  name,
  kind: 'category',
  categories,
});
const ann = (key: string, name: string): LayerPreset => ({ key, name, kind: 'annotation', categories: [] });

export const LAYER_PRESETS: readonly LayerPreset[] = [
  cat('walls', 'Stěny a sloupy', ['wall', 'column', 'curtain-wall']),
  cat('openings', 'Okna a dveře', ['window', 'door', 'opening']),
  cat('slabs', 'Desky', ['slab', 'covering']),
  cat('roofs', 'Střechy', ['roof']),
  cat('stairs', 'Schodiště a zábradlí', ['stair', 'railing']),
  cat('rooms', 'Místnosti', ['room']),
  cat('furniture', 'Nábytek', ['furniture']),
  cat('site', 'Situace', ['terrain', 'earthwork']),
  cat('symbols', 'Značky', ['symbol']),
  ann('drawing-2d', 'Kresba 2D'),
  ann('dims-study', 'Kóty a popisky – studie'),
  ann('dims-dsp', 'Kóty a popisky – DSP a PPS'),
  ann('dims-pps', 'Kóty a popisky – PPS'),
];
