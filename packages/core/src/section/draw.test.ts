import { describe, expect, it } from 'vitest';
import type { Primitive } from '../drawing/primitives.ts';
import { fixture, type Fixture } from '../testing/fixture.ts';
import { drawView } from '../view/draw-view.ts';
import { drawSection } from './draw.ts';
import { elevationText } from '../level-dim/value.ts';

/** Stěna Zdivo 300 po ose x 0 → 6000 a řez napříč v x = 3000 s pohledem doleva (k −x). */
function across(f: Fixture, extra: Record<string, unknown> = {}) {
  const wall = f.line({ x: 0, y: 0 }, { x: 6000, y: 0 });
  const [id] = f.run('section.create', {
    start: { x: 3000, y: -2000 },
    end: { x: 3000, y: 2000 },
    styleId: f.style('Projekt'),
    ...extra,
  });
  return { wall, id: id as string };
}

const prims = (f: Fixture, id: string) => drawSection(f.model, id).primitives;
const byRole = (ps: readonly Primitive[], role: string) => ps.filter((p) => p.source.role === role);
const ys = (p: Primitive) => (p.kind === 'hatch' || p.kind === 'fill' ? p.polygon.map((q) => q.y) : []);

describe('rozhodnutí 19: kresba řezu z modelu', () => {
  it('základ 11: proříznutá stěna = šrafa materiálu a obrys perem řezu stěny z funkce grafiky', () => {
    const f = fixture();
    const { wall, id } = across(f);
    const ps = prims(f, id);
    const hatch = ps.filter((p) => p.kind === 'hatch' && p.source.elementId === wall);
    expect(hatch.length).toBeGreaterThan(0);
    const outline = byRole(ps, 'obrys').filter((p) => p.source.elementId === wall);
    expect(outline[0]?.kind === 'line' && outline[0].stroke.pen).toBe(6);
  });

  it('rozhodnutí 19: otvor ve stěně – řez má parapet a nadpraží, v otvoru nic', () => {
    const f = fixture();
    const { wall, id } = across(f);
    f.run('opening.create', { wallId: wall, offset: 2400, width: 1200, sill: 900, height: 1500 });
    const pieces = prims(f, id).filter((p) => p.kind === 'hatch' && p.source.elementId === wall);
    for (const p of pieces) {
      const y = ys(p);
      expect(Math.min(...y) >= 2400 - 1e-6 || Math.max(...y) <= 900 + 1e-6).toBe(true);
    }
    // Ostění za rovinou řezu: pohledové hrany otvoru (parapet, nadpraží) perem pohledu.
    const edges = byRole(prims(f, id), 'pohledová hrana');
    expect(edges.some((p) => p.kind === 'line' && p.points.every((q) => Math.abs(q.y - 900) < 1e-6))).toBe(
      true,
    );
  });

  it('základ 5: hrubá podrobnost (Studie) bez šraf, jen výplň z grafiky a obrys', () => {
    const f = fixture();
    const { id } = across(f, { styleId: f.style('Studie') });
    const ps = prims(f, id);
    expect(ps.some((p) => p.kind === 'hatch')).toBe(false);
    expect(byRole(ps, 'obrys').length).toBeGreaterThan(0);
  });

  it('rozhodnutí 19: stěna za rovinou do hloubky pohledu tenčím perem, za hloubkou se nekreslí', () => {
    const f = fixture();
    const back = f.line({ x: 0, y: 3000 }, { x: 6000, y: 3000 });
    const [id] = f.run('section.create', { start: { x: -1000, y: -1000 }, end: { x: 7000, y: -1000 } });
    const edges = byRole(prims(f, id as string), 'pohledová hrana').filter(
      (p) => p.source.elementId === back,
    );
    expect(edges.length).toBeGreaterThan(0);
    expect(edges[0]?.kind === 'line' && edges[0].stroke.pen).toBe(3);
    f.run('section.update', { sectionId: id, depth: 2000 });
    expect(byRole(prims(f, id as string), 'pohledová hrana')).toHaveLength(0);
  });

  it('rozhodnutí 19: bližší stěna zakryje hrany vzdálenější (skryté čáry se nekreslí)', () => {
    const f = fixture();
    const near = f.line({ x: 0, y: 1000 }, { x: 6000, y: 1000 });
    const far = f.line({ x: 2000, y: 3000 }, { x: 4000, y: 3000 });
    const [id] = f.run('section.create', { start: { x: -1000, y: 0 }, end: { x: 7000, y: 0 } });
    const edges = byRole(prims(f, id as string), 'pohledová hrana');
    expect(edges.some((p) => p.source.elementId === near)).toBe(true);
    // Svislé hrany vzdálenější stěny jsou za bližší; vodorovné splývají s jejími hranami.
    const vertical = (p: Primitive) =>
      p.kind === 'line' && Math.abs((p.points[0]?.x ?? 0) - (p.points[1]?.x ?? 0)) < 1e-6;
    expect(edges.some((p) => p.source.elementId === far && vertical(p))).toBe(false);
  });

  it('rozhodnutí 19: deska v řezu po vrstvách skladby se šrafou materiálu každé vrstvy', () => {
    const f = fixture();
    const typeId = Object.values(f.model.slabTypes).find((t) => t.name === 'ŽB strop 250')?.id;
    const [slab] = f.run('slab.create', {
      storeyId: f.storeyId,
      typeId,
      rect: { a: { x: 0, y: 0 }, b: { x: 6000, y: 4000 } },
    });
    const [id] = f.run('section.create', {
      start: { x: 3000, y: -1000 },
      end: { x: 3000, y: 5000 },
      styleId: f.style('Projekt'),
    });
    const hatches = prims(f, id as string).filter((p) => p.kind === 'hatch' && p.source.elementId === slab);
    const type = f.model.slabTypes[typeId as string];
    const layers = f.model.compositions[type?.compositionId as string]?.layers.length;
    expect(hatches).toHaveLength(layers as number);
  });

  it('základ 26: skrytá vrstva Stěny – stěna se v řezu nekreslí; filtr rekonstrukce skryje bourané', () => {
    const f = fixture();
    const { wall, id } = across(f);
    f.run('wall.setProperties', { wallIds: [wall], status: 'demolished' });
    const phase = Object.values(f.model.display.overrideCombinations).find((c) =>
      c.name.includes('plánovaný'),
    );
    f.run('section.update', { sectionId: id, phaseFilterId: phase?.id });
    expect(prims(f, id).some((p) => p.source.elementId === wall)).toBe(false);
  });

  it('rozhodnutí 19: pohled (fasáda) nic neprořízne, jen pohledové hrany', () => {
    const f = fixture();
    f.line({ x: 0, y: 0 }, { x: 6000, y: 0 });
    const [south] = f.run('elevation.create', {});
    const ps = prims(f, south as string);
    expect(ps.some((p) => p.kind === 'hatch')).toBe(false);
    expect(byRole(ps, 'pohledová hrana').length).toBeGreaterThan(0);
  });

  it('rozhodnutí 19 / Ardit: úroveň podlaží tence čárkovaně, vlevo mimo budovu „1.NP ±0,000“ nad praporkem', () => {
    const f = fixture();
    const { id } = across(f);
    const ps = prims(f, id);
    expect(byRole(ps, 'úroveň podlaží')[0]?.kind === 'line' && byRole(ps, 'úroveň podlaží')[0]).toMatchObject(
      {
        stroke: { lineType: 'dashed', pen: 1 },
      },
    );
    const texts = ps.flatMap((p) => (p.kind === 'text' ? [p.text] : []));
    expect(texts).toContain('1.NP ±0,000');
    // Praporek a text jsou vlevo mimo budovu (stěna v řezu začíná v u > 0), text drobný (paperSizes.levelText).
    const label = ps.find((p) => p.kind === 'text' && p.text === '1.NP ±0,000');
    const wallLeft = Math.min(...ps.flatMap((p) => (p.kind === 'hatch' ? p.polygon.map((q) => q.x) : [])));
    expect(label?.kind === 'text' && label.at.x).toBeLessThan(wallLeft);
    expect(label?.kind === 'text' && label.heightMm).toBe(f.model.display.paperSizes.levelText);
    expect(elevationText(-150)).toBe('-0,150');
    expect(elevationText(3000)).toBe('+3,000');
  });

  it('rozhodnutí 19: oblouková stěna proříznutá řezem má řez po vrstvách', () => {
    const f = fixture();
    const [arc] = f.run('wall.create', {
      storeyId: f.storeyId,
      typeId: f.type('Zdivo 300'),
      path: { kind: 'arc', start: { x: 0, y: 0 }, end: { x: 6000, y: 0 }, bulge: 0.5 },
    });
    const [id] = f.run('section.create', {
      start: { x: 3000, y: -4000 },
      end: { x: 3000, y: 2000 },
      styleId: f.style('Projekt'),
    });
    expect(prims(f, id as string).some((p) => p.kind === 'hatch' && p.source.elementId === arc)).toBe(true);
  });
});

describe('rozhodnutí 19: značka řezu v půdorysu', () => {
  const marks = (f: Fixture) =>
    drawView(f.model, f.viewId).primitives.filter((p) => p.source.role === 'značka řezu');

  it('základ 28: tlusté konce perem řezu značek, čerchovaná čára, písmeno; skrytá skupina anotací značku skryje', () => {
    const f = fixture();
    const { id } = across(f);
    const ps = marks(f);
    const pens = ps.flatMap((p) => (p.kind === 'line' ? [p.stroke.pen] : []));
    expect(pens).toContain(5);
    expect(ps.some((p) => p.kind === 'line' && p.stroke.lineType === 'dash-dot')).toBe(true);
    expect(ps.filter((p) => p.kind === 'text' && p.text === 'A')).toHaveLength(2);
    f.run('view.setLayerState', {
      viewId: f.viewId,
      layerId: f.model.sections[id]?.annotationLayerId,
      visible: false,
    });
    expect(marks(f)).toHaveLength(0);
  });

  it('rozhodnutí 19: pohledy (fasády) značku v půdorysu nemají; řez mimo podlaží taky ne', () => {
    const f = fixture();
    f.line({ x: 0, y: 0 }, { x: 6000, y: 0 });
    f.run('elevation.create', {});
    expect(marks(f)).toHaveLength(0);
    across(f, { range: { bottom: 5000, top: 8000 } });
    expect(marks(f)).toHaveLength(0);
  });
});
