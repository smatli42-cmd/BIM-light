import { describe, expect, it } from 'vitest';
import { createEmptyProject } from '../model/create.ts';
import { sequentialIds } from '../ids/index.ts';
import { GLYPHS } from './glyphs.ts';
import { DEFAULT_ELECTRO_GROUPS } from './groups.ts';
import { ELECTRO_LIBRARY, electroLibraryTypes } from './library.ts';

/** Typy z knihovny Arditu (screenshoty 14–18), které musí knihovna mít. */
const ARDIT = [
  'Zásuvka',
  'Dvojzásuvka',
  'Trojzásuvka',
  'Spínač č. 1',
  'Přepínač č. 6',
  'Přepínač č. 5',
  'Přepínač č. 6 + zásuvka',
  'Přepínač č. 6 + č. 5 + zásuvka',
  'Datová zásuvka',
  'Zásuvka + datová',
  'Anténní zásuvka',
  'Ovladač stínění',
  'Zásuvka nad linkou 1150',
  'Dvojzásuvka nad linkou 1150',
  'Stmívač',
  'Vývod 1f',
  'Vývod 3f',
  'Videotelefon',
  'Termostat',
  'Wallbox',
  'Ventilátor',
  'Hlásič kouře',
  'Detektor CO',
  'Wi-Fi AP',
  'Kamera stropní',
  'Kamera nástěnná',
  'PIR čidlo zabezpečení',
  'Magnetický kontakt',
  'Siréna',
  'Klávesnice',
  'Ústředna EZS',
  'Zvonek',
  'Svítidlo stropní',
  'Svítidlo přisazené',
  'Svítidlo závěsné',
  'Svítidlo nástěnné',
  'Svítidlo liniové',
  'LED pásek',
  'Svítidlo venkovní',
  'Svítidlo s čidlem',
  'Rozvaděč hlavní (RH)',
  'Rozvaděč podružný',
  'Rozvaděč elektroměrový',
  'Rozvaděč datový',
];
const byName = (name: string) => ELECTRO_LIBRARY.find((i) => i.name === name);

describe('koncepce 3 Elektro: knihovna typů podle ČSN EN 60617', () => {
  it('obsahuje všechny typy z knihovny Arditu (přístroje, zařízení, svítidla, rozvaděče), klíče se neopakují', () => {
    expect(ARDIT.filter((n) => !byName(n))).toEqual([]);
    expect(new Set(ELECTRO_LIBRARY.map((i) => i.key)).size).toBe(ELECTRO_LIBRARY.length);
  });

  it('typ = symbol, popis, výchozí výška, skupina legendy, třída IFC (koncepce 3)', () => {
    const groups = new Set(DEFAULT_ELECTRO_GROUPS.map((g) => g.id));
    for (const i of ELECTRO_LIBRARY) {
      expect(i.description.length, i.name).toBeGreaterThan(5);
      expect(groups.has(i.groupId), i.name).toBe(true);
      expect(i.ifcClass, i.name).toMatch(/^Ifc[A-Z]/);
      expect(i.predefinedType, i.name).toMatch(/^[A-Z]+$/);
      if (i.symbol.kind === 'glyphs')
        expect(
          i.symbol.glyphs.every((g) => g in GLYPHS),
          i.name,
        ).toBe(true);
      expect(i.mount === 'ceiling', i.name).toBe(i.defaultHeight === null);
    }
  });

  it('třídy IFC podle druhu: zásuvky IfcOutlet, spínače IfcSwitchingDevice, svítidla IfcLightFixture, rozvaděče IfcElectricDistributionBoard, čidla IfcSensor', () => {
    expect(byName('Dvojzásuvka')?.ifcClass).toBe('IfcOutlet');
    expect(byName('Spínač č. 1')?.ifcClass).toBe('IfcSwitchingDevice');
    expect(byName('Svítidlo stropní')?.ifcClass).toBe('IfcLightFixture');
    expect(byName('Rozvaděč hlavní (RH)')?.ifcClass).toBe('IfcElectricDistributionBoard');
    expect(byName('Hlásič kouře')?.ifcClass).toBe('IfcSensor');
    expect(byName('Siréna')?.ifcClass).toBe('IfcAlarm');
    expect(byName('Wi-Fi AP')?.ifcClass).toBe('IfcCommunicationsAppliance');
  });

  it('výchozí výšky (česká praxe): zásuvky a data 300, spínače 1050 (legenda Arditu), nad linkou 1150, hlásiče na stropě', () => {
    expect(byName('Zásuvka')?.defaultHeight).toBe(300);
    expect(byName('Datová zásuvka')?.defaultHeight).toBe(300);
    expect(byName('Spínač č. 1')?.defaultHeight).toBe(1050);
    expect(byName('Přepínač č. 6 + zásuvka')?.defaultHeight).toBe(1050);
    expect(byName('Svítidlo venkovní')?.defaultHeight).toBe(2300);
    expect(byName('Videotelefon')?.defaultHeight).toBe(1400);
    expect(byName('Zvonek')?.defaultHeight).toBe(1400);
    expect(byName('Termostat')?.defaultHeight).toBe(1500);
    expect(byName('Dvojzásuvka nad linkou 1150')?.defaultHeight).toBe(1150);
    expect(byName('Hlásič kouře')?.defaultHeight).toBeNull();
    expect(byName('Svítidlo stropní')?.defaultHeight).toBeNull();
  });

  it('rozvaděč (Ardit): 600 × 800 × 150, střed 1400, bez zapuštění; složené přístroje jsou sloty vedle sebe', () => {
    const rh = byName('Rozvaděč hlavní (RH)');
    expect(rh?.board).toEqual({ width: 600, height: 800, depth: 150, recess: 0 });
    expect(rh?.defaultHeight).toBe(1400);
    expect(byName('Přepínač č. 6 + č. 5 + zásuvka')?.symbol).toEqual({
      kind: 'glyphs',
      glyphs: ['switch6', 'switch5', 'socket'],
    });
  });

  it('legenda Arditu: skupiny v pořadí Silnoproud, Osvětlení a ovládání, Data, AV a anténa, Zabezpečení a požár, Řízení a signalizace', () => {
    const names = [...DEFAULT_ELECTRO_GROUPS].sort((a, b) => a.order - b.order).map((g) => g.name);
    expect(names).toEqual([
      'Silnoproud',
      'Osvětlení a ovládání',
      'Data',
      'AV a anténa',
      'Zabezpečení a požár',
      'Řízení a signalizace',
    ]);
    const group = (n: string) => DEFAULT_ELECTRO_GROUPS.find((g) => g.id === byName(n)?.groupId)?.name;
    expect(group('Zvonek')).toBe('Řízení a signalizace');
    expect(group('Termostat')).toBe('Řízení a signalizace');
    expect(group('Wallbox')).toBe('Silnoproud');
    expect(group('Videotelefon')).toBe('AV a anténa');
    expect(group('Hlásič kouře')).toBe('Zabezpečení a požár');
  });

  it('základ 21: projekt má kopii celé knihovny se stálými id a odkazem na původ', () => {
    const m = createEmptyProject(sequentialIds());
    expect(Object.keys(m.electroTypes)).toEqual(Object.keys(electroLibraryTypes()));
    expect(m.electroTypes['et-socket']?.source).toEqual({
      libraryId: 'electro-csn-60617',
      itemId: 'socket',
      version: 1,
    });
    expect(Object.keys(m.electroGroups)).toHaveLength(6);
    expect(m.electroElements).toEqual({});
  });
});
