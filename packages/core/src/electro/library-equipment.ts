// Knihovna: zařízení (čidla, zabezpečení, Wi-Fi) a rozvaděče. Hlásiče a Wi-Fi AP na stropě (výška null),
// zařízení na stěně ve výšce podle praxe; rozvaděč 600 × 800 × 150, střed 1400 (vzor Arditu).
import { ELECTRO_GROUP_IDS as G } from './groups.ts';
import { glyphItem, type ElectroLibraryItem } from './library-item.ts';
import type { BoardKind } from './types.ts';

const dev = (
  groupId: string,
  ifcClass: string,
  predefinedType: string,
  height: number | null,
  glyph: string,
) => ({
  family: 'equipment' as const,
  groupId,
  ifcClass,
  predefinedType,
  height,
  glyphs: [glyph],
});

export const EQUIPMENT_ITEMS: readonly ElectroLibraryItem[] = [
  glyphItem(
    'smoke',
    'Hlásič kouře',
    'Autonomní hlásič kouře',
    dev(G.security, 'IfcSensor', 'SMOKESENSOR', null, 'smoke'),
  ),
  glyphItem(
    'co',
    'Detektor CO',
    'Detektor oxidu uhelnatého',
    dev(G.security, 'IfcSensor', 'COSENSOR', null, 'co'),
  ),
  glyphItem(
    'wifi',
    'Wi-Fi AP',
    'Přístupový bod Wi-Fi',
    dev(G.data, 'IfcCommunicationsAppliance', 'NETWORKAPPLIANCE', null, 'wifi'),
  ),
  glyphItem(
    'camera-ceiling',
    'Kamera stropní',
    'Kamera CCTV na strop',
    dev(G.security, 'IfcAudioVisualAppliance', 'CAMERA', null, 'camera-ceiling'),
  ),
  glyphItem(
    'camera-wall',
    'Kamera nástěnná',
    'Kamera CCTV na stěnu',
    dev(G.security, 'IfcAudioVisualAppliance', 'CAMERA', 2500, 'camera-wall'),
  ),
  glyphItem(
    'pir',
    'PIR čidlo zabezpečení',
    'Pohybové čidlo EZS',
    dev(G.security, 'IfcSensor', 'MOVEMENTSENSOR', 2200, 'pir'),
  ),
  glyphItem(
    'contact',
    'Magnetický kontakt',
    'Magnetický kontakt okna / dveří',
    dev(G.security, 'IfcSensor', 'CONTACTSENSOR', 2000, 'contact'),
  ),
  glyphItem('siren', 'Siréna', 'Siréna EZS', dev(G.security, 'IfcAlarm', 'SIREN', 2500, 'siren')),
  glyphItem(
    'keypad',
    'Klávesnice',
    'Klávesnice EZS',
    dev(G.security, 'IfcSwitchingDevice', 'KEYPAD', 1500, 'keypad'),
  ),
  glyphItem(
    'alarm-panel',
    'Ústředna EZS',
    'Ústředna elektrické zabezpečovací signalizace',
    dev(G.security, 'IfcUnitaryControlElement', 'ALARMPANEL', 1500, 'alarm-panel'),
  ),
  glyphItem('bell', 'Zvonek', 'Domovní zvonek / gong', dev(G.control, 'IfcAlarm', 'BELL', 1400, 'bell')),
];

const board = (
  key: string,
  name: string,
  description: string,
  kind: BoardKind,
  groupId: string,
  predefinedType = 'DISTRIBUTIONBOARD',
): ElectroLibraryItem => ({
  key,
  name,
  description,
  family: 'board',
  groupId,
  ifcClass: 'IfcElectricDistributionBoard',
  predefinedType,
  mount: 'wall',
  defaultHeight: 1400,
  symbol: { kind: 'board', board: kind },
  board: { width: 600, height: 800, depth: 150, recess: 0 },
});

export const BOARD_ITEMS: readonly ElectroLibraryItem[] = [
  board('board-main', 'Rozvaděč hlavní (RH)', 'Hlavní domovní rozvaděč', 'main', G.power),
  board('board-sub', 'Rozvaděč podružný', 'Podružný rozvaděč', 'sub', G.power),
  board('board-meter', 'Rozvaděč elektroměrový', 'Elektroměrový rozvaděč', 'meter', G.power),
  board('board-data', 'Rozvaděč datový', 'Datový rozvaděč (rack)', 'data', G.data, 'USERDEFINED'),
];
