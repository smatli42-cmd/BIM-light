// Hlášení uživatele 2026-11-28 (po 713e829): rohy střechy L s různými sklony nenavazují v půdorysu ani ve 3D.
import { describe, expect, it } from 'vitest';
import type { Vec2 } from '../geometry/index.ts';
import { nearestOnPath } from '../geometry/index.ts';
import { sequentialIds } from '../ids/index.ts';
import { buildSample, findSample } from '../samples/index.ts';
import { drawRoof } from './draw.ts';
import { roofGeometry } from './planes.ts';
import { roofSolids } from './solids.ts';
import type { Roof } from './types.ts';
import type { Vec3 } from '../covering/frame.ts';
import { BASE_GRAPHICS } from '../style/presets/defaults.ts';

type Edit = { readonly indices: readonly number[]; readonly slope?: number; readonly overhang?: number };
function lRoof(edits: readonly Edit[] = []) {
  const m = buildSample(findSample('strechy')!, sequentialIds());
  const r0 = Object.values(m.elements).find((e) => e.category === 'roof' && e.outline.length === 6) as Roof;
  let edges = r0.edges;
  for (const e of edits)
    edges = edges.map((x, i) => (e.indices.includes(i) ? { ...x, ...e, kind: x.kind } : x));
  return { m, roof: { ...r0, edges } };
}

const CASES = [
  ['ukázka (45° / 30°)', []],
  [
    '30° / 45° a různé přesahy',
    [
      { indices: [0, 3, 4, 5], slope: 30 },
      { indices: [1, 2], slope: 45, overhang: 800 },
    ],
  ],
  [
    'tři sklony',
    [
      { indices: [0], slope: 25 },
      { indices: [3], slope: 55, overhang: 300 },
    ],
  ],
] as const;

const near = (a: Vec3, b: Vec3) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z) < 1;

describe('hlášení uživatele 2026-11-28 / střechy: rohy L s různými sklony', () => {
  it.each(CASES)(
    '3D – %s: v každé vrstvě sdílí sousední roviny celou hranu (nároží, úžlabí, hřeben)',
    (_, edits) => {
      const { m, roof } = lRoof([...edits]);
      const g = roofGeometry(m, roof);
      const solids = roofSolids(m, roof, g);
      for (const s of solids) {
        const p = g.planes.find((q) => q.edge === s.plane)!;
        for (const surf of ['bottom', 'top'] as const)
          p.bounds.forEach((bd, k) => {
            if (bd.kind !== 'plane') return;
            const other = solids.find((o) => o.plane === bd.plane && o.layer === s.layer)![surf];
            const a = s[surf][k]!;
            const b = s[surf][(k + 1) % p.polygon.length]!;
            for (const q of [a, b])
              expect(
                other.some((o) => near(o, q)),
                `rovina ${p.edge}/${bd.plane} vrstva ${s.layer}`,
              ).toBe(true);
          });
      }
    },
  );

  it.each(CASES)(
    'půdorys – %s: čáry průsečíku s rovinou řezu se v rozích potkají konec na konec (žádné schody)',
    (_, edits) => {
      const { m, roof } = lRoof([...edits]);
      const lines = drawRoof(m, roof, 1000, BASE_GRAPHICS).flatMap((p) =>
        p.kind === 'line' ? [{ pts: p.points as readonly Vec2[], role: p.source?.role }] : [],
      );
      const cuts = lines.filter((l) => l.role === 'střecha v řezu');
      expect(cuts.length).toBeGreaterThan(6);
      for (const c of cuts)
        for (const end of c.pts) {
          // Roh: konec jiné čáry průsečíku (sousední rovina), nebo okap / štít (kraj střechy).
          const onOther =
            cuts.some((l) => l !== c && l.pts.some((q) => Math.hypot(q.x - end.x, q.y - end.y) < 1)) ||
            lines.some(
              (l) =>
                (l.role === 'okap' || l.role === 'štít') &&
                nearestOnPath({ kind: 'line', start: l.pts[0]!, end: l.pts[1]! }, end).distance < 1,
            );
          expect(onOther, `konec ${Math.round(end.x)}, ${Math.round(end.y)}`).toBe(true);
        }
    },
  );

  it.each(CASES)('půdorys – %s: nároží a úžlabí jsou přímky až do obrysu okapu', (_, edits) => {
    const { m, roof } = lRoof([...edits]);
    const prims = drawRoof(m, roof, 1000, BASE_GRAPHICS);
    const hips = prims.flatMap((p) =>
      p.kind === 'line' && (p.source?.role === 'nároží' || p.source?.role === 'úžlabí') ? [p.points] : [],
    );
    const eaves = prims.flatMap((p) => (p.kind === 'line' && p.source?.role === 'okap' ? [p.points] : []));
    // Každý konec nároží je buď na okapu, nebo navazuje na jinou čáru střechy (hřeben, další kus nároží).
    const all = prims.flatMap((p) => (p.kind === 'line' ? [p.points] : []));
    for (const h of hips)
      for (const end of h) {
        const ok = all.some(
          (l) => l !== h && nearestOnPath({ kind: 'line', start: l[0]!, end: l[1]! }, end).distance < 1,
        );
        expect(ok).toBe(true);
      }
    expect(eaves.length).toBeGreaterThan(5);
    // Horní čára průsečíku (horní líc) se v rohu potká přímo na nakresleném nároží / úžlabí.
    const cuts = prims.flatMap((p) =>
      p.kind === 'line' && p.source?.role === 'střecha v řezu' ? [p.points] : [],
    );
    const corners = cuts
      .flatMap((c) => c)
      .filter((q) => cuts.filter((d) => d.some((r) => Math.hypot(r.x - q.x, r.y - q.y) < 1)).length > 1);
    const onHip = (q: Vec2) =>
      hips.some((h) => nearestOnPath({ kind: 'line', start: h[0]!, end: h[1]! }, q).distance < 1);
    expect(corners.filter(onHip).length).toBeGreaterThan(0);
  });
});
