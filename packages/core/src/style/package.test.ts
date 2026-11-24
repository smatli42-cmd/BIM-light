import { describe, expect, it } from 'vitest';
import { sequentialIds } from '../ids/index.ts';
import { fixture } from '../testing/fixture.ts';
import { mergeDisplay, previewImport } from './package-merge.ts';
import { exportDisplayPackage, parseDisplayPackage } from './package.ts';

describe('katalog-pohledy / základ 31: nastavení zobrazení je přenositelný JSON', () => {
  it('export a pak import stylu dá stejná data', () => {
    const f = fixture();
    const parsed = parseDisplayPackage(exportDisplayPackage(f.model.display));
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.settings).toEqual(f.model.display);
      expect(parsed.warnings).toEqual([]);
    }
  });

  it('import se shodnými názvy v režimu „nahradit“ zachová data i id', () => {
    const f = fixture();
    const before = f.model.display;
    f.run('display.import', { json: exportDisplayPackage(before), mode: 'replace' });
    expect(f.model.display).toEqual(before);
  });

  it('import nikdy nemění prvky modelu ani kóty', () => {
    const f = fixture();
    f.line({ x: 0, y: 0 }, { x: 5000, y: 0 });
    const { elements, dimensions } = f.model;
    f.run('display.import', { json: exportDisplayPackage(f.model.display), mode: 'keep-both' });
    expect(f.model.elements).toBe(elements);
    expect(f.model.dimensions).toBe(dimensions);
  });

  it('neplatný import program nerozbije a nic nezmění', () => {
    const f = fixture();
    const before = f.model;
    for (const json of [
      '{',
      '{"format":"jiny"}',
      JSON.stringify({ format: 'bim-light-display', schemaVersion: 1 }),
    ]) {
      const r = f.editor.execute('display.import', { json, mode: 'replace' });
      expect(r.ok).toBe(false);
    }
    expect(f.model).toBe(before);
  });

  it('soubor z novější verze programu se odmítne se srozumitelnou chybou', () => {
    const f = fixture();
    const json = exportDisplayPackage({ ...f.model.display, schemaVersion: 99 });
    const r = parseDisplayPackage(json);
    expect(r.ok).toBe(false);
    expect(!r.ok && r.errors[0]).toContain('novější');
  });

  it('neznámá vlastnost v pravidle: pravidlo se vypne s upozorněním', () => {
    const f = fixture();
    const d = f.model.display;
    const rule = {
      id: 'x',
      name: 'Podle U-hodnoty',
      conditions: [{ property: 'uValue', op: 'eq', value: 0.3 }],
      effect: {},
    };
    const json = exportDisplayPackage({ ...d, rules: { ...d.rules, x: rule } } as typeof d);
    const r = parseDisplayPackage(json);
    expect(r.ok && r.settings.rules['x']?.disabled).toBe(true);
    expect(r.ok && r.warnings[0]).toContain('Podle U-hodnoty');
  });

  it('náhled importu a režim „ponechat obě“ (nové id, název „(2)“)', () => {
    const f = fixture();
    const d = f.model.display;
    expect(previewImport(d, d).styles).toEqual({ add: 0, replace: 2 });
    const merged = mergeDisplay(d, d, 'keep-both', sequentialIds(7));
    const names = Object.values(merged.styles)
      .map((s) => s.name)
      .sort();
    expect(names).toEqual(['Projekt', 'Projekt (2)', 'Studie', 'Studie (2)']);
    const copy = Object.values(merged.styles).find((s) => s.name === 'Studie (2)');
    expect(copy && merged.layerCombinations[copy.layerCombinationId]).toBeTruthy();
    expect(copy && merged.layers[copy.defaultAnnotationLayerId]?.kind).toBe('annotation');
  });
});
