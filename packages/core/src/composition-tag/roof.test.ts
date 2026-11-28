import { describe, expect, it } from 'vitest';
import { sequentialIds } from '../ids/index.ts';
import { createCoreRegistry } from '../commands/all.ts';
import { Editor } from '../commands/editor.ts';
import { buildSample, findSample } from '../samples/index.ts';
import { tagLayout } from './content.ts';
import { roofCross } from './roof.ts';

/** Scéna střech: Řez A napříč valbovou střechou 35° (okapy kolmo k řezu). */
function scene() {
  const model = buildSample(findSample('strechy')!, sequentialIds());
  const editor = new Editor(model, { registry: createCoreRegistry(), newId: sequentialIds(9) });
  const sec = Object.values(model.sections).find((s) => s.kind === 'section')!;
  const q = editor.query('section.elements', { sectionId: sec.id });
  const rows = (
    q.ok ? (q.data as { cut: { elementId: string; category: string; u0: number; u1: number }[] }) : null
  )!;
  const row = rows.cut.find((r) => r.category === 'roof')!;
  return { editor, sec, row };
}

const deg = (r: number) => (r * 180) / Math.PI;

describe('pokyn uživatele 2026-11-28: popis skladby na střeše v řezu', () => {
  it('kolmice k rovině střechy: v řezu kolmém k okapu svírá se svislicí sklon 35°, tloušťka = skladba', () => {
    const { editor, sec, row } = scene();
    const u = row.u0 + (row.u1 - row.u0) * 0.3;
    const r = roofCross(editor.model, sec, row.elementId, u)!;
    expect(deg(Math.atan2(Math.abs(r.normal.x), r.normal.y))).toBeCloseTo(35, 3);
    // R1: 13 + 1 + 200 + 1 + 40 + 40 + 30 = 325 mm kolmo k rovině.
    expect(r.thickness).toBeCloseTo(325, 3);
  });

  it('popis: čára kolmo přes celou skladbu (od SDK po krytinu), vrstvy shora dolů, číslo = značka R1', () => {
    const { editor, sec, row } = scene();
    const u = row.u0 + (row.u1 - row.u0) * 0.3;
    const r = roofCross(editor.model, sec, row.elementId, u)!;
    const at = { x: r.bottom.x + r.normal.x * 100, y: r.bottom.y + r.normal.y * 100 };
    // První bod na kolmici (AI ho může dát i vedle – srovná se), druhý lomí čáru vodorovně.
    const bend = { x: at.x + r.normal.x * 1500, y: at.y + r.normal.y * 1500 };
    const points = [bend, { x: at.x - 4000, y: bend.y }];
    const res = editor.execute('compositionTag.create', {
      sectionId: sec.id,
      elementId: row.elementId,
      at,
      points,
    });
    expect(res.ok).toBe(true);
    const tag = Object.values(editor.model.compositionTags)[0]!;
    const l = tagLayout(editor.model, sec, tag)!;
    const [p0, p1] = [l.path[0]!, l.path[1]!];
    expect(p0.x).toBeCloseTo(r.bottom.x, 3);
    expect(p0.y).toBeCloseTo(r.bottom.y, 3);
    const d = { x: p1.x - p0.x, y: p1.y - p0.y };
    expect(Math.abs(d.x * r.normal.y - d.y * r.normal.x)).toBeLessThan(1e-6);
    expect(Math.hypot(d.x, d.y)).toBeGreaterThan(r.thickness);
    expect(l.path[2]!.y).toBeCloseTo(p1.y, 6);
    expect(l.mark).toBe('R1');
    expect(l.lines[0]).toBe('Krytina pálená tl. 30 mm');
    expect(l.lines.at(-1)).toBe('Sádrokarton tl. 13 mm');
    // Bod uchycení je přesně tam, kam AI klikla (uložený poměrem po délce a přes tloušťku).
    expect(l.anchor.x).toBeCloseTo(at.x, 3);
    expect(l.anchor.y).toBeCloseTo(at.y, 3);
  });

  it('změna skladby typu střechy hned přepíše text popisu (základ 4)', () => {
    const { editor, sec, row } = scene();
    const u = row.u0 + (row.u1 - row.u0) * 0.3;
    const r = roofCross(editor.model, sec, row.elementId, u)!;
    editor.execute('compositionTag.create', { sectionId: sec.id, elementId: row.elementId, at: r.bottom });
    const tag = Object.values(editor.model.compositionTags)[0]!;
    const roof = editor.model.elements[row.elementId]!;
    const type = editor.model.roofTypes[roof.typeId]!;
    const comp = editor.model.compositions[type.compositionId]!;
    const layers = comp.layers.map((l, i) => (i === comp.layers.length - 1 ? { ...l, thickness: 25 } : l));
    const next = {
      ...editor.model,
      compositions: { ...editor.model.compositions, [comp.id]: { ...comp, layers } },
    };
    expect(tagLayout(next, sec, tag)!.lines[0]).toBe('Krytina pálená tl. 25 mm');
  });
});
