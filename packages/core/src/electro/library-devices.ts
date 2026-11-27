// Knihovna: přístroje (zásuvky, spínače, vývody, krabičky na stěně). Výšky osy nad čistou podlahou
// podle české praxe (katalog-elektro.md): zásuvky a data 300, spínače 1050 (legenda Arditu), nad linkou 1150.
import { ELECTRO_GROUP_IDS as G } from './groups.ts';
import { glyphItem, type ElectroLibraryItem } from './library-item.ts';

const outlet = (predefinedType: string, groupId: string, height: number, glyphs: string[]) => ({
  family: 'device' as const,
  groupId,
  ifcClass: 'IfcOutlet',
  predefinedType,
  height,
  glyphs,
});
const sw = (predefinedType: string, glyphs: string[], groupId: string = G.lighting) => ({
  family: 'device' as const,
  groupId,
  ifcClass: 'IfcSwitchingDevice',
  predefinedType,
  height: 1050,
  glyphs,
});
const P = 'POWEROUTLET';

export const DEVICE_ITEMS: readonly ElectroLibraryItem[] = [
  glyphItem('socket', 'Zásuvka', 'Zásuvka 230 V jednonásobná', outlet(P, G.power, 300, ['socket'])),
  glyphItem(
    'socket2',
    'Dvojzásuvka',
    'Zásuvka 230 V dvojnásobná',
    outlet(P, G.power, 300, ['socket', 'socket']),
  ),
  glyphItem(
    'socket3',
    'Trojzásuvka',
    'Zásuvka 230 V trojnásobná',
    outlet(P, G.power, 300, ['socket', 'socket', 'socket']),
  ),
  glyphItem('switch1', 'Spínač č. 1', 'Spínač jednopólový (řazení 1)', sw('TOGGLESWITCH', ['switch1'])),
  glyphItem('switch6', 'Přepínač č. 6', 'Přepínač střídavý (řazení 6)', sw('TOGGLESWITCH', ['switch6'])),
  glyphItem('switch5', 'Přepínač č. 5', 'Přepínač sériový (řazení 5)', sw('TOGGLESWITCH', ['switch5'])),
  glyphItem(
    'switch6-socket',
    'Přepínač č. 6 + zásuvka',
    'Přepínač střídavý a zásuvka 230 V ve společném rámečku',
    sw('TOGGLESWITCH', ['switch6', 'socket']),
  ),
  glyphItem(
    'switch6-5-socket',
    'Přepínač č. 6 + č. 5 + zásuvka',
    'Přepínač střídavý, sériový a zásuvka 230 V ve společném rámečku',
    sw('TOGGLESWITCH', ['switch6', 'switch5', 'socket']),
  ),
  glyphItem('data', 'Datová zásuvka', 'Datová zásuvka RJ45', outlet('DATAOUTLET', G.data, 300, ['data'])),
  glyphItem(
    'socket-data',
    'Zásuvka + datová',
    'Zásuvka 230 V a datová zásuvka RJ45 ve společném rámečku',
    outlet('USERDEFINED', G.power, 300, ['socket', 'data']),
  ),
  glyphItem(
    'tv',
    'Anténní zásuvka',
    'Anténní zásuvka TV / R / SAT',
    outlet('AUDIOVISUALOUTLET', G.av, 300, ['tv']),
  ),
  glyphItem('blind', 'Ovladač stínění', 'Ovladač žaluzií a rolet', sw('USERDEFINED', ['blind'], G.control)),
  glyphItem(
    'socket-1150',
    'Zásuvka nad linkou 1150',
    'Zásuvka 230 V nad kuchyňskou linkou',
    outlet(P, G.power, 1150, ['socket']),
  ),
  glyphItem(
    'socket2-1150',
    'Dvojzásuvka nad linkou 1150',
    'Zásuvka 230 V dvojnásobná nad kuchyňskou linkou',
    outlet(P, G.power, 1150, ['socket', 'socket']),
  ),
  glyphItem('dimmer', 'Stmívač', 'Stmívač osvětlení', sw('DIMMERSWITCH', ['dimmer'])),
  glyphItem('outlet1f', 'Vývod 1f', 'Vývod 230 V pro pevně připojený spotřebič', {
    family: 'device',
    groupId: G.power,
    ifcClass: 'IfcJunctionBox',
    predefinedType: 'POWER',
    height: 1200,
    glyphs: ['outlet1f'],
  }),
  glyphItem('outlet3f', 'Vývod 3f', 'Vývod 400 V (sporák, varná deska)', {
    family: 'device',
    groupId: G.power,
    ifcClass: 'IfcJunctionBox',
    predefinedType: 'POWER',
    height: 600,
    glyphs: ['outlet3f'],
  }),
  glyphItem('videophone', 'Videotelefon', 'Domácí videotelefon', {
    family: 'device',
    groupId: G.av,
    ifcClass: 'IfcAudioVisualAppliance',
    predefinedType: 'COMMUNICATIONTERMINAL',
    height: 1400,
    glyphs: ['videophone'],
  }),
  glyphItem('thermostat', 'Termostat', 'Prostorový termostat', {
    family: 'device',
    groupId: G.control,
    ifcClass: 'IfcUnitaryControlElement',
    predefinedType: 'THERMOSTAT',
    height: 1500,
    glyphs: ['thermostat'],
  }),
  glyphItem('wallbox', 'Wallbox', 'Nabíjecí stanice elektromobilu', {
    family: 'device',
    groupId: G.power,
    ifcClass: 'IfcElectricAppliance',
    predefinedType: 'USERDEFINED',
    height: 1200,
    glyphs: ['wallbox'],
  }),
  glyphItem('fan', 'Ventilátor', 'Ventilátor (odvod vzduchu)', {
    family: 'device',
    groupId: G.control,
    ifcClass: 'IfcFan',
    predefinedType: 'PROPELLORAXIAL',
    height: 2200,
    glyphs: ['fan'],
  }),
];
