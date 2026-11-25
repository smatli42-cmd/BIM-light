import { describe, expect, it } from 'vitest';
import { vec } from '../geometry/index.ts';
import { fixture } from '../testing/fixture.ts';
import { layersArea, ownerAt, outlineArea } from '../testing/junction.ts';
import { wallGeometry } from '../wall/geometry.ts';

/** Volná stěna 6 m; vrstvy od referenční strany (y = 0) nahoru. */
function wallWith(type: string) {
  const f = fixture();
  const w = f.line(vec(0, 0), vec(6000, 0), { typeId: f.type(type) });
  return { f, w };
}

describe('plan-steny / Z4: otvor řeže všechny vrstvy', () => {
  it('průchozí otvor ve stěně o třech vrstvách: uprostřed otvoru není nic, vedle zůstane vše', () => {
    const { f, w } = wallWith('Obvodová zateplená 465');
    f.run('opening.create', { wallId: w, offset: 2000, width: 1200 });
    for (const y of [7, 150, 400]) expect(ownerAt(f, vec(2600, y))).toBe('');
    expect(ownerAt(f, vec(1990, 7))).toBe('Omítka');
    expect(ownerAt(f, vec(1990, 150))).toBe('Zdivo keramické');
    expect(ownerAt(f, vec(1990, 400))).toBe('Tepelná izolace EPS');
    expect(ownerAt(f, vec(3210, 150))).toBe('Zdivo keramické');
  });

  it('obalení ostění: omítka zahne do otvoru o svou tloušťku; jen jedna strana s povrchem = přes celou tloušťku', () => {
    const { f, w } = wallWith('Obvodová zateplená 465');
    f.run('opening.create', { wallId: w, offset: 2000, width: 1200 });
    expect(ownerAt(f, vec(2005, 7))).toBe('Omítka');
    expect(ownerAt(f, vec(2005, 150))).toBe('Omítka');
    expect(ownerAt(f, vec(2005, 400))).toBe('Omítka');
    expect(ownerAt(f, vec(3195, 400))).toBe('Omítka');
    expect(ownerAt(f, vec(2020, 150))).toBe('');
  });

  it('obalení ostění: omítky obou stran zahnou každá do poloviny jádra (Nosná zeď 330)', () => {
    const { f, w } = wallWith('Nosná zeď 330');
    f.run('opening.create', { wallId: w, offset: 2000, width: 1000 });
    expect(ownerAt(f, vec(2005, 100))).toBe('Omítka');
    expect(ownerAt(f, vec(2005, 250))).toBe('Omítka');
    expect(ownerAt(f, vec(1995, 100))).toBe('Zdivo keramické');
    expect(ownerAt(f, vec(2020, 165))).toBe('');
  });

  it('plocha vrstev = plocha obrysu i s otvorem (vrstvy se nepřekrývají)', () => {
    const { f, w } = wallWith('Nosná zeď 330');
    f.run('opening.create', { wallId: w, offset: 2000, width: 1000 });
    const g = wallGeometry(f.model, f.wall(w));
    expect(layersArea(g)).toBeCloseTo(outlineArea(g), 3);
    expect(layersArea(g)).toBeCloseTo(330 * 6000 - (1000 - 2 * 15) * 330, 0);
  });

  it('smazání otvoru stěnu zacelí', () => {
    const { f, w } = wallWith('Zdivo 300');
    const [o] = f.run('opening.create', { wallId: w, offset: 2000, width: 1200 });
    expect(ownerAt(f, vec(2600, 150))).toBe('');
    f.run('opening.delete', { openingIds: [o] });
    expect(ownerAt(f, vec(2600, 150))).toBe('Zdivo keramické');
  });

  it('nika neprořízne vrstvu na druhé straně', () => {
    const { f, w } = wallWith('Obvodová zateplená 465');
    f.run('opening.create', { wallId: w, offset: 2000, width: 800, kind: 'niche', depth: 200, side: 'ref' });
    expect(ownerAt(f, vec(2400, 7))).toBe('');
    expect(ownerAt(f, vec(2400, 150))).toBe('');
    expect(ownerAt(f, vec(2400, 250))).toBe('Zdivo keramické');
    expect(ownerAt(f, vec(2400, 400))).toBe('Tepelná izolace EPS');
  });
});

describe('plan-steny / Z4: rovina řezu (sekce 2)', () => {
  it('otvor nad rovinou řezu stěnu nepřeruší a kreslí se čárkovaně', () => {
    const { f, w } = wallWith('Zdivo 300');
    f.run('opening.create', { wallId: w, offset: 2000, width: 1200, sill: 1800, height: 600 });
    expect(ownerAt(f, vec(2600, 150))).toBe('Zdivo keramické');
    f.run('view.setCutPlane', { viewId: f.viewId, height: 2000 });
    const cut = wallGeometry(f.model, f.wall(w), 2000);
    expect(cut.layers[0]?.polygons.length).toBe(2);
  });
});
