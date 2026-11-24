import { describe, expect, it } from 'vitest';
import { vec } from '../geometry/index.ts';
import { fixture } from '../testing/fixture.ts';
import { layersArea, outlineArea, ownerAt, totalArea, wallAt } from '../testing/junction.ts';
import { allWallGeometry } from '../wall/geometry.ts';

const areasMatch = (f: ReturnType<typeof fixture>) => {
  for (const g of allWallGeometry(f.model, f.storeyId).values())
    expect(layersArea(g)).toBeCloseTo(outlineArea(g), 3);
};

describe('plan-steny / Z2: kříž X (dvě stěny se protínají uprostřed)', () => {
  function cross(typeA: string, typeB: string) {
    const f = fixture();
    // A vodorovně y 0..t, B svisle x −t..0 (tloušťka doleva od směru +y).
    const a = f.line(vec(-3000, 0), vec(3000, 0), { typeId: f.type(typeA) });
    const b = f.line(vec(0, -3000), vec(0, 3000), { typeId: f.type(typeB) });
    f.run('wall.cross', { wallId: b, toWallId: a });
    return { f, a, b };
  }

  it('stejný typ: jádra splynou (vyhrává hostitel), omítky se v koutech potkají, žádné překryvy', () => {
    const { f, a } = cross('Příčka 100', 'Příčka 100');
    expect(wallAt(f, vec(-50, 50))).toBe(a);
    expect(ownerAt(f, vec(-50, 50))).toBe('Zdivo keramické');
    expect(ownerAt(f, vec(-50, 5))).toBe('Zdivo keramické');
    expect(ownerAt(f, vec(-3, 5))).toBe('Omítka');
    areasMatch(f);
    expect(totalArea(f)).toBeCloseTo(6000 * 100 + 6000 * 100 - 100 * 100, 1);
  });

  it('vyšší priorita projede: ŽB stěna prořízne zdivo i omítky příčky', () => {
    const { f, b } = cross('Příčka 100', 'ŽB stěna 200');
    expect(wallAt(f, vec(-100, 50))).toBe(b);
    expect(wallAt(f, vec(-100, 5))).toBe(b);
    areasMatch(f);
  });

  it('bez příkazu se protínající stěny nečistí (vztah je uložený, základ 24)', () => {
    const f = fixture();
    f.line(vec(-3000, 0), vec(3000, 0), { typeId: f.type('Příčka 100') });
    f.line(vec(0, -3000), vec(0, 3000), { typeId: f.type('Příčka 100') });
    expect(ownerAt(f, vec(-50, 50))).toBe('VÍC');
  });

  it('kreslení přes jinou stěnu (autoConnect, jako myší) uloží kříž samo', () => {
    const f = fixture();
    const t = f.type('Příčka 100');
    f.line(vec(-3000, 0), vec(3000, 0), { typeId: t });
    f.line(vec(0, -3000), vec(0, 3000), { typeId: t, autoConnect: true });
    const x = Object.values(f.model.relations).filter(
      (r) => r.relating.at === 'ATPATH' && r.related.at === 'ATPATH',
    );
    expect(x).toHaveLength(1);
    expect(ownerAt(f, vec(-50, 50))).toBe('Zdivo keramické');
  });
});

describe('plan-steny / Z2: stěny v jedné přímce', () => {
  it('různé tloušťky za sebou: kolmý řez v uzlu, stejný materiál bez čáry', () => {
    const f = fixture();
    const a = f.line(vec(0, 0), vec(3000, 0), { typeId: f.type('Nosná zeď 330') });
    const b = f.line(vec(3000, 0), vec(6000, 0), {
      typeId: f.type('Příčka 150'),
      connections: [{ end: 'start', wallId: a, at: 'ATEND' }],
    });
    const g = allWallGeometry(f.model, f.storeyId);
    expect(g.get(a)!.cuts.end.join).toBe('straight');
    expect(wallAt(f, vec(2990, 100))).toBe(a);
    expect(wallAt(f, vec(3010, 100))).toBe(b);
    expect(ownerAt(f, vec(3010, 200))).toBe('');
    areasMatch(f);
  });
});

describe('plan-steny / Z2: tři a více konců v uzlu', () => {
  it('T ze tří konců (rozdělený hostitel): dvojice v přímce je hostitel, třetí stěna se napojí jako T', () => {
    const f = fixture();
    const t = f.type('Příčka 100');
    const a = f.line(vec(0, 0), vec(3000, 0), { typeId: t });
    const b = f.line(vec(3000, 0), vec(6000, 0), {
      typeId: t,
      connections: [{ end: 'start', wallId: a, at: 'ATEND' }],
    });
    const c = f.line(vec(3000, -3000), vec(3000, 0), {
      typeId: t,
      connections: [
        { end: 'end', wallId: a, at: 'ATEND' },
        { end: 'end', wallId: b, at: 'ATSTART' },
      ],
    });
    const g = allWallGeometry(f.model, f.storeyId);
    expect(g.get(c)!.cuts.end.join).toBe('multiple');
    // Jádro třetí stěny (x 2910..2990) projde omítkou hostitele (y 0..10) k jeho jádru.
    expect(wallAt(f, vec(2950, 5))).toBe(c);
    expect(ownerAt(f, vec(2950, 50))).toBe('Zdivo keramické');
    expect(ownerAt(f, vec(2905, 5))).toBe('Omítka');
    for (let x = 2800; x <= 3200; x += 13)
      for (let y = -200; y <= 120; y += 11) expect(ownerAt(f, vec(x + 0.3, y + 0.3))).not.toBe('VÍC');
    areasMatch(f);
    expect(totalArea(f)).toBeCloseTo(6000 * 100 + 3000 * 100, 1);
  });
});

describe('plan-steny / Z2, rozhodnutí C: volný konec s uzavřeným čelem', () => {
  it('omítky obou stran zahnou přes čelo do poloviny jádra; plocha vrstev = obrys', () => {
    const f = fixture();
    const id = f.line(vec(0, 0), vec(3000, 0), { typeId: f.type('Nosná zeď 330') });
    // Nosná zeď 330: omítka y 0..15, zdivo 15..315, omítka 315..330. Konec x = 3000.
    expect(ownerAt(f, vec(2995, 100))).toBe('Omítka');
    expect(ownerAt(f, vec(2995, 250))).toBe('Omítka');
    expect(ownerAt(f, vec(2980, 100))).toBe('Zdivo keramické');
    expect(ownerAt(f, vec(5, 160))).toBe('Omítka');
    const g = allWallGeometry(f.model, f.storeyId).get(id)!;
    expect(g.layers[0]!.polygons).toHaveLength(1);
    expect(layersArea(g)).toBeCloseTo(3000 * 330, 3);
    expect(outlineArea(g)).toBeCloseTo(3000 * 330, 3);
  });

  it('povrch jen na jedné straně (zateplená bez vnější omítky): omítka zahne přes celé čelo', () => {
    const f = fixture();
    f.line(vec(0, 0), vec(3000, 0), { typeId: f.type('Obvodová zateplená 465') });
    expect(ownerAt(f, vec(2995, 400))).toBe('Omítka');
    expect(ownerAt(f, vec(2980, 400))).toBe('Tepelná izolace EPS');
  });

  it('typ bez povrchových vrstev: kolmé čelo', () => {
    const f = fixture();
    f.line(vec(0, 0), vec(3000, 0));
    expect(ownerAt(f, vec(2999, 150))).toBe('Zdivo keramické');
  });
});

describe('plan-steny / Z2: nespojovat (jako Disallow Join)', () => {
  it('roh s příznakem nespojovat: konce jsou volné (roh zůstane prázdný), příkaz jde vrátit', () => {
    const f = fixture();
    const t = f.type('Příčka 100');
    const a = f.line(vec(3000, 0), vec(0, 0), { typeId: t });
    const b = f.line(vec(0, 0), vec(0, 3000), {
      typeId: t,
      connections: [{ end: 'start', wallId: a, at: 'ATEND' }],
    });
    const before = ownerAt(f, vec(-50, -50));
    f.run('wall.setJoin', { wallId: b, end: 'start', join: false });
    const g = allWallGeometry(f.model, f.storeyId);
    expect(g.get(a)!.cuts.end.join).toBe('free');
    expect(g.get(b)!.cuts.start.join).toBe('free');
    expect(ownerAt(f, vec(-50, -50))).toBe('');
    expect(wallAt(f, vec(-50, 50))).toBe(b);
    f.editor.undo();
    expect(ownerAt(f, vec(-50, -50))).toBe(before);
  });
});
