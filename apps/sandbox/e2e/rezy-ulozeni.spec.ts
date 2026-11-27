// Prohlížečové testy uložení stropu na stěně v řezu (priorita materiálů, Archicad priorita průniku / Revit
// k jádru): v Řezu A ukázky strop nad 1.NP prořízne zdivo obvodové stěny, zateplení jde přes čelo desky.
// Obsah řezu se čte dotazem section.elements (stejný výpočet jako kresba).
import { expect, test } from '@playwright/test';

test('priorita materiálů / Řez A: strop prořízne zdivo obvodové stěny, zateplení jde přes čelo', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1700, height: 1000 });
  await page.goto('./?ukazka=rezy');
  await page.waitForFunction(() => !!window.__bim);
  await page.getByTestId('ct-project').click();
  await page.getByTestId('open-section-Řez A').click();
  await expect
    .poll(async () => Number(await page.getByTestId('section-canvas').getAttribute('data-hatches')))
    .toBeGreaterThan(10);
  const r = await page.evaluate(() => {
    const b = window.__bim!;
    const m = b.model();
    const sec = Object.values(m.sections).find((s) => s.name === 'Řez A')!;
    type Piece = { materialId: string; bottom: number; top: number };
    type Row = { elementId: string; bottom: number; top: number; pieces: Piece[] };
    const c = b.query('section.elements', { sectionId: sec.id }) as { cut: Row[] };
    const mat = (key: string) => Object.values(m.materials).find((x) => x.source?.itemId === key)!.id;
    const upper = Object.values(m.storeys).find((s) => s.elevation > 0)!.id;
    const outer = Object.values(m.wallTypes).find((t) => t.name === 'Obvodová zateplená 465')!.id;
    const slab = Object.values(m.elements).find(
      (e) =>
        e.category === 'slab' && e.storeyId === upper && m.slabTypes[e.typeId]?.slabFunction === 'structure',
    )!;
    const slabRow = c.cut.find((x) => x.elementId === slab.id)!;
    const walls = c.cut.filter((x) => m.elements[x.elementId]?.typeId === outer && x.bottom < slabRow.bottom);
    const masonry = walls.flatMap((w) => w.pieces.filter((p) => p.materialId === mat('masonry-ceramic')));
    const ins = walls.flatMap((w) => w.pieces.filter((p) => p.materialId === mat('insulation-eps')));
    return {
      walls: walls.length,
      masonryInSlab: masonry.filter((p) => p.bottom < slabRow.top - 1 && p.top > slabRow.bottom + 1).length,
      insulationOverSlab: ins.some((p) => p.top >= slabRow.top - 1),
    };
  });
  expect(r.walls).toBeGreaterThan(0);
  expect(r.masonryInSlab).toBe(0);
  expect(r.insulationOverSlab).toBe(true);
});
