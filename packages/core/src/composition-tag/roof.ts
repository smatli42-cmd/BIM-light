// Popis skladby na střeše v řezu (pokyn uživatele 2026-11-28): rovina střechy proříznutá rovinou řezu je na
// výkrese šikmá čára; odkazová čára jde kolmo k ní přes celou skladbu (od SDK po krytinu). Kolmice a líce se
// počítají z geometrie střechy (roof/planes.ts) – stejné roviny jako kresba řezu (roof/section.ts).
import type { Vec2 } from '../geometry/index.ts';
import type { Id } from '../ids/index.ts';
import type { Model } from '../model/types.ts';
import { planeZ, roofGeometry } from '../roof/planes.ts';
import { findRoof, roofLayerOffsets, roofLayers } from '../roof/queries.ts';
import { roofCut } from '../roof/section.ts';
import { atFrame, effectiveFrame } from '../section/frame.ts';
import type { Section } from '../section/types.ts';
import { pointInPolygon } from '../selection/pick.ts';

/** Skladba střechy v místě u výkresu: spodní líc, jednotková kolmice ven (nahoru) a tloušťka na výkrese. */
export interface RoofCross {
  readonly bottom: Vec2;
  readonly normal: Vec2;
  readonly thickness: number;
}

/** Řezaná rovina střechy v místě u (nejvyšší, když se jich v u potká víc); null = střecha tu řezaná není. */
export function roofCross(model: Model, s: Section, roofId: Id, u: number): RoofCross | null {
  const roof = findRoof(model, roofId);
  if (!roof) return null;
  const f = effectiveFrame(model.sectionPresets, s);
  const part = f.parts.find((p) => u >= p.u0 && u <= p.u1) ?? f.parts[0];
  if (!part) return null;
  const geo = roofGeometry(model, roof);
  const D = roofLayerOffsets(roofLayers(model, roof));
  const q = atFrame(f, u, part.d0);
  const q1 = atFrame(f, u + 1, part.d0);
  const hits = geo.planes
    .filter((p) => pointInPolygon(q, p.polygon))
    .map((p) => {
      const sec = 1 / p.normal.z;
      const z = planeZ(geo, p.edge, q) + (D[0] ?? 0) * sec;
      const k = planeZ(geo, p.edge, q1) - planeZ(geo, p.edge, q);
      return { z, k, sec };
    })
    .sort((a, b) => b.z - a.z);
  const h = hits[0];
  if (!h) return null;
  const len = Math.hypot(1, h.k);
  const total = (D[D.length - 1] ?? 0) - (D[0] ?? 0);
  return {
    bottom: { x: u, y: h.z },
    normal: { x: -h.k / len, y: 1 / len },
    thickness: (total * h.sec) / len,
  };
}

/** Řezaná střecha pod bodem výkresu (pro nástroj Popis skladby; výběr v řezu střechy zatím nezná). */
export function roofCutAt(model: Model, s: Section, p: Vec2): Id | null {
  if (s.kind !== 'section') return null;
  const f = effectiveFrame(model.sectionPresets, s);
  const roofs = Object.values(model.elements).filter((e) => e.category === 'roof');
  for (const r of roofs) {
    const roof = findRoof(model, r.id);
    if (!roof) continue;
    const shapes = roofCut(model, roof, f, s.range).flatMap((c) => c.shapes);
    if (shapes.some((sh) => pointInPolygon(p, sh.outer))) return roof.id;
  }
  return null;
}
