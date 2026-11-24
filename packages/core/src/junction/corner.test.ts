import { describe, expect, it } from 'vitest';
import { vec } from '../geometry/index.ts';
import { fixture } from '../testing/fixture.ts';
import { layersArea, outlineArea, ownerAt, totalArea, wallAt } from '../testing/junction.ts';
import { allWallGeometry } from '../wall/geometry.ts';

/**
 * Roh L s vnitřním lícem v osách: A vodorovně z (5000,0) do (0,0), tloušťka y < 0;
 * B svisle z (0,0) do (0,5000), tloušťka x < 0. Vnější roh je vlevo dole.
 */
function corner(typeA: string, typeB = typeA) {
  const f = fixture();
  const a = f.line(vec(5000, 0), vec(0, 0), { typeId: f.type(typeA) });
  const b = f.line(vec(0, 0), vec(0, 5000), {
    typeId: f.type(typeB),
    connections: [{ end: 'start', wallId: a, at: 'ATEND' }],
  });
  return { f, a, b };
}

describe('plan-steny / Z2: roh L po vrstvách (priorita materiálů)', () => {
  it('roh L, tři vrstvy, stejný typ: jádro na jádro, izolace kolem vnějšího rohu, omítka ve vnitřním rohu', () => {
    const { f } = corner('Obvodová zateplená 465');
    expect(ownerAt(f, vec(-400, -400))).toBe('Tepelná izolace EPS');
    expect(ownerAt(f, vec(-200, -200))).toBe('Zdivo keramické');
    expect(ownerAt(f, vec(-5, -5))).toBe('Omítka');
    // Omítka B (x −15..0) v pásu jádra A: jádro A ji prořízne (vyšší priorita).
    expect(ownerAt(f, vec(-5, -200))).toBe('Zdivo keramické');
    // Izolace A (y −465..−315) pod jádrem B: izolace pokračuje k vnějšímu líci.
    expect(ownerAt(f, vec(-200, -400))).toBe('Tepelná izolace EPS');
    expect(ownerAt(f, vec(-470, -470))).toBe('');
  });

  it('roh L: pokos jádra je úhlopříčka rohu (stejný typ = symetrický)', () => {
    const { f, a, b } = corner('Obvodová zateplená 465');
    expect(wallAt(f, vec(-100, -200))).toBe(a);
    expect(wallAt(f, vec(-200, -100))).toBe(b);
  });

  it('roh L, různé skladby: zdivo bez omítky × zateplená; izolace podjede jádro až k líci druhé stěny', () => {
    const { f, a, b } = corner('Obvodová zateplená 465', 'Zdivo 300');
    expect(ownerAt(f, vec(-150, -400))).toBe('Tepelná izolace EPS');
    expect(wallAt(f, vec(-150, -400))).toBe(a);
    // Vnější roh končí na vnějším líci zdiva (x = −300).
    expect(ownerAt(f, vec(-290, -460))).toBe('Tepelná izolace EPS');
    expect(ownerAt(f, vec(-310, -460))).toBe('');
    // Omítka A končí na jádře B, jádro B dojde k jádru A.
    expect(wallAt(f, vec(-150, -5))).toBe(b);
    expect(ownerAt(f, vec(-150, -5))).toBe('Zdivo keramické');
  });

  it('roh L: plocha vrstev = plocha obrysu u každé stěny a celek nemá díry ani překryvy', () => {
    const { f } = corner('Obvodová zateplená 465');
    for (const g of allWallGeometry(f.model, f.storeyId).values())
      expect(layersArea(g)).toBeCloseTo(outlineArea(g), 3);
    expect(totalArea(f)).toBeCloseTo(465 * 10000 + 465 * 465, 1);
  });

  it('roh L, příčky s omítkou (Příčka 100 × Příčka 150): omítka obteče oba rohy', () => {
    const { f } = corner('Příčka 100', 'Příčka 150');
    // Vnitřní roh: omítky se potkají pokosem.
    expect(ownerAt(f, vec(-3, -3))).toBe('Omítka');
    // Vnější roh: vnější omítky (A y −100..−90, B x −150..−140) se potkají.
    expect(ownerAt(f, vec(-147, -97))).toBe('Omítka');
    expect(ownerAt(f, vec(-100, -50))).toBe('Zdivo keramické');
    expect(totalArea(f)).toBeCloseTo(100 * 5000 + 150 * 5000 + 100 * 150, 1);
  });

  it('šikmé napojení (60°): žádné díry ani překryvy, vrstvy každé stěny = obrys', () => {
    const f = fixture();
    const t = f.type('Obvodová zateplená 465');
    const a = f.line(vec(5000, 0), vec(0, 0), { typeId: t });
    const dir = vec(Math.cos(Math.PI / 3), Math.sin(Math.PI / 3));
    f.line(vec(0, 0), vec(dir.x * 5000, dir.y * 5000), {
      typeId: t,
      connections: [{ end: 'start', wallId: a, at: 'ATEND' }],
    });
    for (const g of allWallGeometry(f.model, f.storeyId).values()) {
      expect(g.cuts.start.join === 'corner' || g.cuts.end.join === 'corner').toBe(true);
      expect(layersArea(g)).toBeCloseTo(outlineArea(g), 3);
    }
    for (let x = -600; x <= 400; x += 37)
      for (let y = -500; y <= 100; y += 41) expect(ownerAt(f, vec(x + 0.5, y + 0.5))).not.toBe('VÍC');
  });
});
