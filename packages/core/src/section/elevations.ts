// Pohledy (fasády) kolem budovy (Revit „Elevation“ ×4, Archicad „Elevation“): obálka stěn a desek hlavního
// modelu + odstup, čtyři čáry kolem ní, každá se dívá dovnitř. Název podle světové strany, kam fasáda hledí
// (georeference: natočení osy Y od severu), např. „Jižní“ (skupina v Obsahu se jmenuje Pohledy).
import { tessellate, type Vec2 } from '../geometry/index.ts';
import type { Model } from '../model/types.ts';
import { allSlabs } from '../slab/queries.ts';
import { allWalls, wallSection } from '../wall/queries.ts';
import type { Wall } from '../wall/types.ts';
import type { SectionDirection } from './types.ts';

export interface ElevationSpec {
  readonly name: string;
  readonly mark: string;
  readonly start: Vec2;
  readonly end: Vec2;
  readonly direction: SectionDirection;
}

/** Výchozí odstup čáry pohledu od obálky budovy (mm). */
export const ELEVATION_MARGIN = 3000;

const SIDES = ['severní', 'východní', 'jižní', 'západní'] as const;

/** Světová strana, kam hledí fasáda s vnější normálou `n` (v osách modelu). */
export function compassSide(model: Model, n: Vec2): (typeof SIDES)[number] {
  const az = (Math.atan2(n.x, n.y) * 180) / Math.PI + model.project.georef.rotationDeg;
  const i = Math.round((((az % 360) + 360) % 360) / 90) % 4;
  return SIDES[i] as (typeof SIDES)[number];
}

/** Název pohledu = světová strana s velkým písmenem („Jižní“). */
const sideName = (side: string) => side.charAt(0).toUpperCase() + side.slice(1);

/** Výchozí název pohledu podle světové strany („Jižní“)? Ten se při přepočtu obnoví (otočení severu). */
export function isCompassName(name: string): boolean {
  return SIDES.some((side) => name === sideName(side));
}

/** Název ručně kresleného pohledu: fasáda hledí proti směru pohledu (`look` = kam se díváme). */
export function elevationName(model: Model, look: Vec2): string {
  return sideName(compassSide(model, { x: -look.x, y: -look.y }));
}

/**
 * Body obálky stěny: osa (oblouk rozložený) rozšířená o největší odsazení líce na každou stranu. Bez
 * výpočtu napojení (běží po každém příkazu); obálka je nanejvýš o tloušťku stěny větší než skutečná.
 */
function wallEnvelope(model: Model, wall: Wall): Vec2[] {
  const f = wallSection(model, wall).faces;
  const r = Math.max(Math.abs(f.ref), Math.abs(f.opp));
  return tessellate(wall.path).flatMap((p) => [
    { x: p.x - r, y: p.y - r },
    { x: p.x + r, y: p.y + r },
  ]);
}

/** Obálka modelu v půdorysu (stěny a desky hlavního modelu); null = prázdný model. */
export function modelEnvelope(model: Model): { min: Vec2; max: Vec2 } | null {
  const pts: Vec2[] = [];
  for (const w of allWalls(model)) if (w.variant.kind === 'main') pts.push(...wallEnvelope(model, w));
  for (const s of allSlabs(model)) if (s.variant.kind === 'main') pts.push(...s.outline);
  if (!pts.length) return null;
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  return { min: { x: Math.min(...xs), y: Math.min(...ys) }, max: { x: Math.max(...xs), y: Math.max(...ys) } };
}

/** Čtyři pohledy kolem obálky; čára je o odstup delší na obě strany, dívá se doleva = dovnitř. */
export function elevationsAround(model: Model, margin = ELEVATION_MARGIN): ElevationSpec[] {
  const env = modelEnvelope(model);
  if (!env) return [];
  const x0 = env.min.x - margin;
  const x1 = env.max.x + margin;
  const y0 = env.min.y - margin;
  const y1 = env.max.y + margin;
  // Obíhá proti směru hodin: levá strana čáry je uvnitř obálky.
  const lines: { start: Vec2; end: Vec2; out: Vec2 }[] = [
    { start: { x: x0, y: y0 }, end: { x: x1, y: y0 }, out: { x: 0, y: -1 } },
    { start: { x: x1, y: y0 }, end: { x: x1, y: y1 }, out: { x: 1, y: 0 } },
    { start: { x: x1, y: y1 }, end: { x: x0, y: y1 }, out: { x: 0, y: 1 } },
    { start: { x: x0, y: y1 }, end: { x: x0, y: y0 }, out: { x: -1, y: 0 } },
  ];
  return lines.map((l, i) => ({
    name: sideName(compassSide(model, l.out)),
    mark: String(i + 1),
    start: l.start,
    end: l.end,
    direction: 'left',
  }));
}
