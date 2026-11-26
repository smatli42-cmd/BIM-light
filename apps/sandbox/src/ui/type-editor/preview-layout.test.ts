import { describe, expect, it } from 'vitest';
import { layerAt, previewLayout, type PreviewFace, type PreviewLayer } from './preview-layout.ts';

// Obvodová zateplená 465: omítka 15 | zdivo 300 | EPS 150 (od referenční strany).
const L: PreviewLayer[] = [15, 300, 150].map((thickness) => ({ thickness, extendTop: 0, extendBottom: 0 }));
const W = 440;
const H = 300;

const box = (f: PreviewFace) => {
  const xs = f.poly.map((p) => p.x);
  const ys = f.poly.map((p) => p.y);
  return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
};

describe('koncepce rozhraní 11a / Editor typů krok 2: náhled skladby', () => {
  it('půdorys: vrstvy jako vodorovné pásy ve skutečném poměru, referenční strana dole', () => {
    const lay = previewLayout('plan', L, 0, W, H);
    const [a, b, c] = lay.faces.map(box);
    expect(b!.y1 - b!.y0).toBeCloseTo(((a!.y1 - a!.y0) * 300) / 15);
    expect(a!.y0).toBeGreaterThan(b!.y0);
    expect(b!.y0).toBeGreaterThan(c!.y0);
    // stěna je delší než tlustá (úsek stěny, ne roztažený pruh)
    expect(a!.x1 - a!.x0).toBeGreaterThan(2 * (a!.y1 - c!.y0));
    // referenční čára na líci u první vrstvy
    expect(lay.refLine?.[0].y).toBeCloseTo(a!.y1);
  });

  it('půdorys: kóty tlouštěk (malé vrstvy jen v celkové kótě) a celková tloušťka', () => {
    const texts = previewLayout('plan', L, 0, W, H).dims.map((d) => d.text);
    expect(texts).toContain('300');
    expect(texts).toContain('150');
    expect(texts.at(-1)).toBe('465');
  });

  it('řez: vrstvy svisle, referenční strana vlevo, prodloužení vrstvy nahoru je vidět', () => {
    const ls = L.map((l, i) => (i === 2 ? { ...l, extendTop: 200 } : l));
    const lay = previewLayout('section', ls, 0, W, H);
    const [a, b, c] = lay.faces.map(box);
    expect(a!.x0).toBeLessThan(b!.x0);
    expect(b!.x0).toBeLessThan(c!.x0);
    expect(b!.y1 - b!.y0).toBeGreaterThan(b!.x1 - b!.x0);
    expect(b!.y0 - c!.y0).toBeCloseTo(200 * lay.k);
  });

  it('3D výsek: každá vrstva má čelo, horní plochu a líc; vnější vrstva nejkratší (schody)', () => {
    const lay = previewLayout('iso', L, 0, W, H);
    for (const i of [0, 1, 2])
      expect(lay.faces.filter((f) => f.layer === i).map((f) => f.kind)).toEqual(['side', 'top', 'cut']);
    // poloha čela podél stěny: průmět středu čela do směru délky izometrie (cos 30°, sin 30°)
    const along = (i: number) => {
      const b = box(lay.faces.find((f) => f.layer === i && f.kind === 'cut')!);
      return ((b.x0 + b.x1) / 2) * Math.cos(Math.PI / 6) + ((b.y0 + b.y1) / 2) * 0.5;
    };
    expect(along(2)).toBeLessThan(along(1));
    expect(along(1)).toBeLessThan(along(0));
    for (const f of lay.faces) for (const p of f.poly) expect(p.x).toBeGreaterThanOrEqual(0);
  });

  it('výběr vrstvy klikem: bod uprostřed náhledu je zdivo; mimo stěnu nic', () => {
    for (const mode of ['plan', 'section'] as const) {
      const lay = previewLayout(mode, L, 0, W, H);
      const b = box(lay.faces[1]!);
      expect(layerAt(lay, { x: (b.x0 + b.x1) / 2, y: (b.y0 + b.y1) / 2 })).toBe(1);
      expect(layerAt(lay, { x: 1, y: 1 })).toBeNull();
    }
    const iso = previewLayout('iso', L, 0, W, H);
    const cut = box(iso.faces.find((f) => f.layer === 2 && f.kind === 'cut')!);
    expect(layerAt(iso, { x: (cut.x0 + cut.x1) / 2, y: (cut.y0 + cut.y1) / 2 })).toBe(2);
  });
});
