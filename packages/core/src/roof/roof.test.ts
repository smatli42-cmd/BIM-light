import { describe, expect, it } from 'vitest';
import { createCoreRegistry } from '../commands/all.ts';
import { Editor } from '../commands/editor.ts';
import { sequentialIds } from '../ids/index.ts';
import { createEmptyProject } from '../model/create.ts';
import { sectionContent } from '../section/content.ts';
import { drawSection } from '../section/draw.ts';
import { drawView } from '../view/draw-view.ts';
import type { Primitive } from '../drawing/primitives.ts';
import { PROJECT_MIGRATIONS } from '../persistence/project-file.ts';
import { migrate } from '../persistence/migrate.ts';
import { roofGeometry } from './planes.ts';
import { roofSolids, solidTriangles } from './solids.ts';
import type { Roof } from './types.ts';

function project(params: Record<string, unknown> = {}) {
  const newId = sequentialIds();
  const ed = new Editor(createEmptyProject(newId), { registry: createCoreRegistry(), newId });
  const storeyId = Object.keys(ed.model.storeys)[0] as string;
  const r = ed.execute('roof.create', {
    storeyId,
    typeId: 'roof-type-tiles-240',
    rect: { a: { x: 0, y: 0 }, b: { x: 10000, y: 6000 } },
    shape: 'gable',
    slope: 40,
    ...params,
  });
  if (!r.ok) throw new Error(r.error.message);
  const id = r.created?.[0] as string;
  return {
    ed,
    id,
    roof: () => ed.model.elements[id] as Roof,
    viewId: Object.keys(ed.model.views)[0] as string,
  };
}

const roles = (prims: readonly Primitive[], role: string) =>
  prims.flatMap((p) => (p.kind === 'line' && p.source?.role === role ? [p] : []));

describe('rozhodnutí 11 / střechy: kresba, řez, 3D tělesa', () => {
  it('rozhodnutí 11 / střechy: nový projekt má 3 typy střech se skladbou „pro střechu“, migrace 41 → 42', () => {
    const { ed } = project();
    expect(Object.values(ed.model.roofTypes).map((t) => t.mark)).toEqual(['R1', 'R2', 'R3']);
    const comp = ed.model.compositions['roof-tiles-240'];
    expect(comp?.use.roof).toBe(true);
    expect(comp?.layers.find((l) => l.function === 'core')?.thickness).toBe(200);
    const { roofTypes: _r, ...old } = ed.model;
    const res = migrate({ ...old, schemaVersion: 41 }, 42, PROJECT_MIGRATIONS);
    expect(res.ok && Object.keys((res.data as { roofTypes: object }).roofTypes)).toHaveLength(3);
  });

  it('rozhodnutí 11 / střechy: v půdorysu nad rovinou řezu čárkovaně (okap, štít, hřeben)', () => {
    const { ed, viewId } = project();
    const prims = drawView(ed.model, viewId).primitives;
    for (const role of ['okap', 'štít', 'hřeben']) {
      const ls = roles(prims, role);
      expect(ls.length, role).toBeGreaterThan(0);
      expect(ls.every((l) => l.stroke?.lineType === 'dashed')).toBe(true);
    }
  });

  it('rozhodnutí 11 / střechy: podkroví – pod rovinou řezu plně, průsečík s rovinou řezu perem řezu', () => {
    const { ed, viewId } = project({ refOffset: 300 });
    const prims = drawView(ed.model, viewId).primitives;
    expect(roles(prims, 'okap').every((l) => l.stroke?.lineType !== 'dashed')).toBe(true);
    expect(roles(prims, 'hřeben').every((l) => l.stroke?.lineType === 'dashed')).toBe(true);
    expect(roles(prims, 'střecha v řezu')).toHaveLength(4);
  });

  it('rozhodnutí 11 / střechy: řez napříč sedlovou střechou – vrstvy obou rovin, šrafa, pohled za řezem', () => {
    const { ed, id } = project();
    const styleId = Object.values(ed.model.display.styles).find((x) => x.name === 'Projekt')?.id;
    const r = ed.execute('section.create', {
      start: { x: 5000, y: -2000 },
      end: { x: 5000, y: 8000 },
      styleId,
    });
    if (!r.ok) throw new Error(r.error.message);
    const sid = r.created?.[0] as string;
    const content = sectionContent(ed.model, ed.model.sections[sid] as never);
    const row = content.cut.find((c) => c.elementId === id);
    expect(row?.pieces).toHaveLength(14);
    // Hřeben: horní líc nad ref. čárou = 3000 + 3000 × tg 40° + tloušťka nad ref. rovinou / cos 40°.
    const top = 3000 + 3000 * Math.tan((40 * Math.PI) / 180) + 311 / Math.cos((40 * Math.PI) / 180);
    expect(row?.top).toBeCloseTo(top, -1);
    const prims = drawSection(ed.model, sid).primitives;
    expect(prims.some((p) => p.kind === 'hatch' && p.source?.elementId === id)).toBe(true);
    const r2 = ed.execute('section.create', { start: { x: -2000, y: -3000 }, end: { x: 12000, y: -3000 } });
    if (!r2.ok) throw new Error(r2.error.message);
    const view = sectionContent(ed.model, ed.model.sections[r2.created?.[0] as string] as never);
    expect(view.seen.some((s) => s.elementId === id)).toBe(true);
  });

  it('rozhodnutí 11 / střechy: 3D tělesa – rovina × vrstva, uzavřený povrch, objem jádra', () => {
    const { ed, roof } = project({ shape: 'hip', slope: 45, overhang: 0 });
    const solids = roofSolids(ed.model, roof());
    expect(solids).toHaveLength(4 * 7);
    const g = roofGeometry(ed.model, roof());
    const core = solids.filter((s) => s.core);
    // Objem tělesa z trojúhelníků (věta o divergenci); jádro ≈ plocha rovin × 200 mm.
    const vol = core.reduce(
      (sum, s) =>
        sum +
        solidTriangles(s).reduce(
          (v, [a, b, c]) =>
            v +
            (a.x * (b.y * c.z - b.z * c.y) - a.y * (b.x * c.z - b.z * c.x) + a.z * (b.x * c.y - b.y * c.x)) /
              6,
          0,
        ),
      0,
    );
    const area = g.planes.reduce((s, p) => s + p.area, 0);
    expect(vol / (area * 200)).toBeGreaterThan(0.95);
    expect(vol / (area * 200)).toBeLessThan(1.05);
  });
});
