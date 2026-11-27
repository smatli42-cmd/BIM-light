// Skupiny legendy (koncepce 3) v pořadí, s názvy a barvami legendy uživatele (Corel SVG 2026-11-27):
// silnoproud, osvětlení a ovládání, data, AV a anténa, stínění, zabezpečení a požár, řízení a signalizace.
// Barva je výchozí grafika skupiny (patro 1). V legendě mají stejnou barvu data a zabezpečení (tyrkys)
// a silnoproud a řízení (červená). Stálá id, aby typy knihovny mohly skupinu odkazovat.
import type { Id } from '../ids/index.ts';
import type { ElectroGroup } from './types.ts';

export const ELECTRO_GROUP_IDS = {
  power: 'eg-power',
  lighting: 'eg-lighting',
  data: 'eg-data',
  av: 'eg-av',
  shading: 'eg-shading',
  security: 'eg-security',
  control: 'eg-control',
} as const;

const G = ELECTRO_GROUP_IDS;

export const DEFAULT_ELECTRO_GROUPS: readonly ElectroGroup[] = [
  { id: G.power, name: 'Silnoproud', color: '#f03d3d', order: 1 },
  { id: G.lighting, name: 'Osvětlení a ovládání', color: '#ffa84d', order: 2 },
  { id: G.data, name: 'Data', color: '#21b8cf', order: 3 },
  { id: G.av, name: 'AV a anténa', color: '#5e3dc2', order: 4 },
  { id: G.shading, name: 'Stínění', color: '#21c996', order: 5 },
  { id: G.security, name: 'Zabezpečení a požár', color: '#21b8cf', order: 6 },
  { id: G.control, name: 'Řízení a signalizace', color: '#f03d3d', order: 7 },
];

/** Skupina znaku slotu rámečku (datová a anténní zásuvka v rámečku se zásuvkami mají svou barvu). */
export const SLOT_GROUP: Readonly<Record<string, string>> = {
  socket: G.power,
  data: G.data,
  tv: G.av,
  switch1: G.lighting,
  switch6: G.lighting,
  switch5: G.lighting,
  dimmer: G.lighting,
  blind: G.shading,
};

export const defaultElectroGroups = (): Record<Id, ElectroGroup> =>
  Object.fromEntries(DEFAULT_ELECTRO_GROUPS.map((g) => [g.id, g]));
