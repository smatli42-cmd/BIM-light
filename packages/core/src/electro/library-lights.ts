// Knihovna: svítidla (ČSN EN 60617-11-15). Stropní na strop (výška null), nástěnné a venkovní na stěnu,
// liniové a LED pásek s délkou v mm modelu (kreslí se ve skutečné délce).
import { ELECTRO_GROUP_IDS as G } from './groups.ts';
import { glyphItem, type ElectroLibraryItem } from './library-item.ts';

const light = (glyph: string, height: number | null, predefinedType = 'POINTSOURCE') => ({
  family: 'light' as const,
  groupId: G.lighting,
  ifcClass: 'IfcLightFixture',
  predefinedType,
  height,
  glyphs: [glyph],
});

const linear = (
  key: string,
  name: string,
  description: string,
  lines: 1 | 2,
  length: number,
): ElectroLibraryItem => ({
  key,
  name,
  description,
  family: 'light',
  groupId: G.lighting,
  ifcClass: 'IfcLightFixture',
  predefinedType: 'DIRECTIONSOURCE',
  mount: 'ceiling',
  defaultHeight: null,
  symbol: { kind: 'linear', lines },
  length,
});

export const LIGHT_ITEMS: readonly ElectroLibraryItem[] = [
  glyphItem('lamp', 'Svítidlo stropní', 'Svítidlo stropní (vývod na stropě)', light('lamp', null)),
  glyphItem(
    'lamp-surface',
    'Svítidlo přisazené',
    'Svítidlo přisazené ke stropu',
    light('lamp-surface', null),
  ),
  glyphItem('lamp-pendant', 'Svítidlo závěsné', 'Svítidlo závěsné', light('lamp-pendant', null)),
  glyphItem('lamp-wall', 'Svítidlo nástěnné', 'Svítidlo nástěnné', light('lamp-wall', 2000)),
  linear('lamp-linear', 'Svítidlo liniové', 'Svítidlo liniové', 1, 1200),
  linear('led-strip', 'LED pásek', 'LED pásek v profilu', 2, 2000),
  glyphItem(
    'lamp-outdoor',
    'Svítidlo venkovní',
    'Svítidlo venkovní nástěnné IP44',
    light('lamp-outdoor', 2200),
  ),
  glyphItem('lamp-sensor', 'Svítidlo s čidlem', 'Svítidlo s pohybovým čidlem', light('lamp-sensor', null)),
];
