// Skupiny legendy (koncepce 3): silnoproud, osvětlení a ovládání, data, AV, zabezpečení, řízení.
// Barvy jsou výchozí grafika skupiny (patro 1), podle vzoru Arditu: zásuvky červeně, vypínače a svítidla
// oranžově, data a TV modře a fialově. Stálá id, aby typy knihovny mohly skupinu odkazovat.
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
  { id: G.av, name: 'AV (TV, rozhlas)', color: '#6a3fbf', order: 4 },
  { id: G.security, name: 'Zabezpečení', color: '#2e7d32', order: 5 },
  { id: G.control, name: 'Řízení', color: '#795548', order: 6 },
];

export const defaultElectroGroups = (): Record<Id, ElectroGroup> =>
  Object.fromEntries(DEFAULT_ELECTRO_GROUPS.map((g) => [g.id, g]));
