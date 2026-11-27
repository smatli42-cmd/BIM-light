// Skupiny legendy (koncepce 3) v pořadí a s názvy legendy Arditu: silnoproud, osvětlení a ovládání, data,
// AV a anténa, zabezpečení a požár, řízení a signalizace. Barvy jsou výchozí grafika skupiny (patro 1)
// podle legendy Arditu: silnoproud červeně, osvětlení oranžově, data modře, AV fialově, zabezpečení
// tyrkysově, řízení tmavě červeně. Stálá id, aby typy knihovny mohly skupinu odkazovat.
import type { Id } from '../ids/index.ts';
import type { ElectroGroup } from './types.ts';

export const ELECTRO_GROUP_IDS = {
  power: 'eg-power',
  lighting: 'eg-lighting',
  data: 'eg-data',
  av: 'eg-av',
  security: 'eg-security',
  control: 'eg-control',
} as const;

const G = ELECTRO_GROUP_IDS;

export const DEFAULT_ELECTRO_GROUPS: readonly ElectroGroup[] = [
  { id: G.power, name: 'Silnoproud', color: '#d32f2f', order: 1 },
  { id: G.lighting, name: 'Osvětlení a ovládání', color: '#ef8a00', order: 2 },
  { id: G.data, name: 'Data', color: '#0288d1', order: 3 },
  { id: G.av, name: 'AV a anténa', color: '#6a3fbf', order: 4 },
  { id: G.security, name: 'Zabezpečení a požár', color: '#00a3b4', order: 5 },
  { id: G.control, name: 'Řízení a signalizace', color: '#b0193e', order: 6 },
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
  blind: G.control,
};

export const defaultElectroGroups = (): Record<Id, ElectroGroup> =>
  Object.fromEntries(DEFAULT_ELECTRO_GROUPS.map((g) => [g.id, g]));
