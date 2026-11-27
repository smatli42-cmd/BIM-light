import { describe, expect, it } from 'vitest';
import type { Primitive } from '../drawing/primitives.ts';
import { vec } from '../geometry/index.ts';
import { fixture, type Fixture } from '../testing/fixture.ts';
import { drawView } from '../view/draw-view.ts';
import { stampLayout } from './draw.ts';
import { roomStampsAt, roomsAt } from './pick.ts';

const setup = () => {
  const f = fixture();
  f.run('wall.rectangle', {
    storeyId: f.storeyId,
    typeId: f.type('Zdivo 300'),
    a: vec(0, 0),
    b: vec(4000, 3000),
  });
  const [id] = f.run('room.create', { storeyId: f.storeyId, point: vec(2000, 1500), name: 'Pokoj' });
  return { f, id: id! };
};
const roomPrims = (f: Fixture, id: string) =>
  drawView(f.model, f.viewId).primitives.filter((p) => p.source.elementId === id);
const texts = (ps: readonly Primitive[]) => ps.flatMap((p) => (p.kind === 'text' ? [p] : []));

describe('prvky stavby 9 / katalog pohledů: razítko místnosti v půdorysu', () => {
  it('katalog pohledů: razítko = číslo, název, plocha; písmo pevné na papíře (základ 29)', () => {
    const { f, id } = setup();
    const t = texts(roomPrims(f, id));
    expect(t.map((p) => p.text)).toEqual(['1.01', 'Pokoj', '12,00 m²']);
    const paper = f.model.display.paperSizes;
    expect(t.map((p) => [p.heightMm, !!p.bold])).toEqual([
      [paper.roomNumberText, true],
      [paper.roomText, false],
      [paper.roomText, false],
    ]);
    // ČSN 01 3420: číslo 2,5 mm, ostatní 1,8 mm; nikdy větší než text kót.
    expect([paper.roomNumberText, paper.roomText]).toEqual([2.5, 1.8]);
    expect(t.every((p) => p.heightMm <= paper.dimensionText)).toBe(true);
    // Řádky nad sebou kolem bodu uvnitř, první nahoře.
    expect(t[0]!.at.y).toBeGreaterThan(t[2]!.at.y);
  });

  it('základ 11: výchozí grafika bez výplně; přepis prvku zapne barevnou výplň obrysu', () => {
    const { f, id } = setup();
    expect(roomPrims(f, id).some((p) => p.kind === 'fill')).toBe(false);
    f.run('element.setGraphicOverride', { elementIds: [id], effect: { fillColor: '#ffe9a8' } });
    const fill = roomPrims(f, id).find((p) => p.kind === 'fill');
    expect(fill?.kind === 'fill' && fill.color).toBe('#ffe9a8');
  });

  it('základ 26: skrytá vrstva Místnosti = žádná kresba a nejde vybrat', () => {
    const { f, id } = setup();
    expect(roomsAt(f.model, f.model.views[f.viewId]!, vec(1000, 1000))).toEqual([id]);
    f.run('view.setLayerState', { viewId: f.viewId, layerId: f.layer('Místnosti'), visible: false });
    expect(roomPrims(f, id)).toEqual([]);
    expect(roomsAt(f.model, f.model.views[f.viewId]!, vec(1000, 1000))).toEqual([]);
  });

  it('prvky stavby 9: neuzavřená místnost ukáže varování místo plochy', () => {
    const f = fixture();
    const [id] = f.run('room.create', { storeyId: f.storeyId, point: vec(0, 0) });
    expect(texts(roomPrims(f, id!)).map((p) => p.text)).toEqual(['1.01', 'Místnost', 'neuzavřená']);
  });

  it('pravidla interakce: razítko jde vybrat a posunout (stampAt), obrys stojí', () => {
    const { f, id } = setup();
    const view = f.model.views[f.viewId]!;
    expect(roomStampsAt(f.model, view, vec(2000, 1500), 10)).toEqual([id]);
    f.run('room.update', { roomId: id, stampAt: vec(1000, 800) });
    expect(roomStampsAt(f.model, f.model.views[f.viewId]!, vec(1000, 800), 10)).toEqual([id]);
    expect(texts(roomPrims(f, id))[2]!.text).toBe('12,00 m²');
  });

  it('ČSN 01 3420: razítko se šesti řádky se vejde do místnosti 3 × 3 m v 1:100 i 1:50', () => {
    const { f, id } = setup();
    const lines = [
      { text: '1.01', number: true },
      { text: 'Obývací pokoj', number: false },
      { text: '19,90 m²', number: false },
      { text: 'Obytné', number: false },
      { text: 'podlaha: dubové parkety', number: false },
      { text: '20 °C', number: false },
    ];
    for (const scale of [100, 50]) {
      const b = stampLayout(lines, scale, f.model.display.paperSizes);
      expect(2 * b.halfW).toBeLessThan(3000);
      expect(2 * b.halfH).toBeLessThan(3000);
    }
    // Řádkování 1,3 × výška textu: řádky na sebe navazují bez velkých mezer.
    const two = stampLayout(lines.slice(0, 2), 100, f.model.display.paperSizes);
    expect(two.halfH * 2).toBeCloseTo((2.5 + 1.8) * 100 * 1.3, 6);
    expect(id).toBeTruthy();
  });
});
