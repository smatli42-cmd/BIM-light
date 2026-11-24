import { describe, expect, it } from 'vitest';
import { createGlobalId, globalIdFromBytes, isGlobalId } from '../ids/index.ts';
import { fixture } from '../testing/fixture.ts';
import { resolveHeight } from './height.ts';
import { SCHEMA_VERSION } from './types.ts';

describe('rozhodnutí / základy 1–3, 9, 12, 17: model ve tvaru IFC', () => {
  it('základ 1: GlobalId má 22 znaků IFC base64 a je náhodné', () => {
    const a = createGlobalId();
    expect(isGlobalId(a)).toBe(true);
    expect(a).not.toBe(createGlobalId());
    expect(globalIdFromBytes(Array(16).fill(0))).toBe('0000000000000000000000');
  });

  it('základ 1: projekt → budova → podlaží → prvek, se třídou IFC a typem', () => {
    const f = fixture();
    const id = f.line({ x: 0, y: 0 }, { x: 5000, y: 0 });
    const w = f.wall(id);
    const storey = f.model.storeys[w.storeyId];
    expect(storey && f.model.buildings[storey.buildingId]).toBeTruthy();
    expect(w.ifcClass).toBe('IfcWall');
    expect(isGlobalId(w.id)).toBe(true);
    expect(f.model.wallTypes[w.typeId]).toBeTruthy();
  });

  it('základ 2: prvek nese kategorii, profesi, stav a variantu', () => {
    const f = fixture();
    const w = f.wall(f.line({ x: 0, y: 0 }, { x: 5000, y: 0 }));
    expect(w.category).toBe('wall');
    expect(w.discipline).toBe('architecture');
    expect(w.status).toBe('new');
    expect(w.variant).toEqual({ kind: 'main' });
  });

  it('základ 6: příkaz zapisuje do varianty, kterou editor právě má', () => {
    const f = fixture();
    f.editor.variant = { kind: 'variant', setId: 'kuchyne', variantId: 'B' };
    const w = f.wall(f.line({ x: 0, y: 0 }, { x: 5000, y: 0 }));
    expect(w.variant).toEqual({ kind: 'variant', setId: 'kuchyne', variantId: 'B' });
  });

  it('základ 3 a 12: výška je 3D a může být vázaná na podlaží; změna podlaží ji přepočítá', () => {
    const f = fixture();
    const [s2] = f.run('storey.create', { name: '2.NP', elevation: 3200, height: 3000 });
    const id = f.line(
      { x: 0, y: 0 },
      { x: 5000, y: 0 },
      {
        height: {
          baseStoreyId: f.storeyId,
          baseOffset: 0,
          top: { kind: 'storey', storeyId: s2, offset: -250 },
        },
      },
    );
    expect(resolveHeight(f.model, f.wall(id).height)).toEqual({ bottom: 0, top: 2950 });
    f.run('storey.update', { storeyId: s2, elevation: 3500 });
    expect(resolveHeight(f.model, f.wall(id).height).top).toBe(3250);
  });

  it('základ 17: poloha projektu (S-JTSK, natočení, ±0,000 v Bpv) se ukládá v projektu', () => {
    const f = fixture();
    f.run('project.setGeoreference', {
      sjtskY: 744000.5,
      sjtskX: 1043000.25,
      rotationDeg: 12,
      elevationBpv: 245.3,
    });
    expect(f.model.project.georef.elevationBpv).toBe(245.3);
  });

  it('základ 9: model nese verzi schématu', () => {
    expect(fixture().model.schemaVersion).toBe(SCHEMA_VERSION);
  });

  it('základ 10 a 21: typ stěny je seznam pásů s vrstvami, materiál má šrafu a prioritu a původ v knihovně', () => {
    const f = fixture();
    const t = f.model.wallTypes[f.type('Obvodová zateplená 465')];
    expect(t?.bands).toHaveLength(1);
    expect(t?.bands[0]?.layers.map((l) => l.function)).toEqual(['finish', 'core', 'insulation']);
    const m = Object.values(f.model.materials)[0];
    expect(f.model.display.hatches[m!.hatchId]).toBeTruthy();
    expect(m?.hatchPen).toBeGreaterThan(0);
    expect(m?.joinPriority).toBeGreaterThan(0);
    expect(m?.source?.libraryId).toBe('bim-light-basic');
  });
});
