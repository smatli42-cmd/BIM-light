// Tvar a kontrola řezu pro příkazy (rozhodnutí 19): parametry, výchozí hodnoty nového řezu a pravidla čáry
// (rovný řez = 2 body, zalomený = úseky rovnoběžné s prvním nebo kolmé, první a poslední řeže).
import { cross, dist, dot, norm, sub, type Vec2 } from '../../geometry/index.ts';
import type { Id } from '../../ids/index.ts';
import type { Model } from '../../model/types.ts';
import { SECTION_LAYER } from '../../style/presets/defaults.ts';
import {
  DEFAULT_SECTION_SCALE,
  nextElevationMark,
  nextSectionMark,
  SECTION_DIRECTIONS,
  type Section,
  type SectionDirection,
  type SectionKind,
  type SectionRange,
} from '../../section/types.ts';
import { elevationName } from '../../section/elevations.ts';
import { styleOf } from '../lookup.ts';
import { S, type JsonSchema } from '../schema.ts';
import { fail } from '../types.ts';

const nullable = (s: JsonSchema, description: string): JsonSchema => ({
  oneOf: [s, { type: 'null' }],
  description,
});

/** Společné parametry tvaru řezu (create i update). */
export const SECTION_PROPS: Record<string, JsonSchema> = {
  points: {
    type: 'array',
    items: S.point,
    minItems: 2,
    description:
      'body čáry řezu v mm: 2 = rovný řez, víc = zalomený (úseky rovnoběžné s prvním řežou, kolmé jsou ' +
      'zalomení; první a poslední úsek musí řezat)',
  },
  start: S.point,
  end: S.point,
  direction: S.enumOf(SECTION_DIRECTIONS, 'kam se díváme: left = doleva od směru čáry, right = doprava'),
  depth: nullable({ type: 'number', exclusiveMinimum: 0 }, 'hloubka pohledu v mm; null = neomezená'),
  farClip: nullable(
    { type: 'number', exclusiveMinimum: 0 },
    'vzdálená oblast od (mm za rovinou, dál tenčí šedou grafikou); null = vypnuto',
  ),
  presetId: nullable(S.id, 'styl řezu (section.presets); null = vlastní hloubka a vzdálená oblast'),
  annotationLayerId: S.id,
  range: nullable(
    S.object({ bottom: { type: 'number' }, top: { type: 'number' } }, ['bottom', 'top']),
    'rozsah výšky kresby v mm nad ±0,000; null = celá budova',
  ),
  scale: S.number('měřítko (jmenovatel, 100 = 1:100)', { exclusiveMinimum: 0 }),
  styleId: S.id,
  mark: { type: 'string', description: 'označení ve značce (A, B…)' },
};

export interface SectionShape {
  points?: Vec2[];
  start?: Vec2;
  end?: Vec2;
  direction?: SectionDirection;
  depth?: number | null;
  farClip?: number | null;
  presetId?: Id | null;
  annotationLayerId?: Id;
  range?: SectionRange | null;
  scale?: number;
  styleId?: Id;
  mark?: string;
}

/** Kontrola čáry: úseky rovnoběžné s prvním nebo kolmé, krajní řežou, řezaná délka aspoň 100 mm. */
function checkPoints(points: readonly Vec2[]) {
  if (points.length < 2) fail('invalid', 'Čára řezu potřebuje aspoň 2 body');
  const d = norm(sub(points[1] as Vec2, points[0] as Vec2));
  let cut = 0;
  for (let i = 0; i + 1 < points.length; i++) {
    const a = points[i] as Vec2;
    const b = points[i + 1] as Vec2;
    const l = dist(a, b);
    if (l < 1) fail('invalid', 'Úsek čáry řezu je kratší než 1 mm');
    const along = Math.abs(dot(d, sub(b, a))) / l;
    const across = Math.abs(cross(d, sub(b, a))) / l;
    const parallel = across < 1e-6;
    if (!parallel && along > 1e-6) fail('invalid', 'Zalomení řezu musí být kolmé na čáru řezu');
    if (!parallel && (i === 0 || i === points.length - 2))
      fail('invalid', 'První a poslední úsek řezu musí řezat (zalomení jen uprostřed)');
    if (parallel) cut += l;
  }
  if (cut < 100) fail('invalid', 'Čára řezu musí být dlouhá aspoň 100 mm');
}

export function checkSection(m: Model, s: Section): Section {
  checkPoints(s.points);
  if (s.range && s.range.top <= s.range.bottom) fail('invalid', 'Rozsah výšky: vršek musí být nad spodkem');
  if (!s.name.trim() || !s.mark.trim()) fail('invalid', 'Název ani označení nesmí být prázdné');
  if (s.presetId && !m.sectionPresets[s.presetId]) fail('not-found', `Styl řezu ${s.presetId} neexistuje`);
  if (m.display.layers[s.annotationLayerId]?.kind !== 'annotation')
    fail('not-found', 'Vrstva značky řezu musí být skupina anotací');
  styleOf(m, s.styleId);
  return s;
}

/** Body čáry z parametrů: `points`, nebo start / end (u zalomeného řezu změní krajní body). */
export function pointsFrom(p: SectionShape, old?: readonly Vec2[]): Vec2[] {
  const pts = [...(p.points ?? old ?? [])];
  if (p.start) pts[0] = p.start;
  if (p.end) pts[Math.max(1, pts.length - 1)] = p.end;
  if (pts.length < 2) fail('invalid-params', 'Chybí body čáry řezu (points, nebo start a end)');
  return pts;
}

const usedMarks = (m: Model, kind: SectionKind) =>
  Object.values(m.sections)
    .filter((s) => s.kind === kind)
    .map((s) => s.mark);

/** Výchozí skupina anotací značky: „Řezy a pohledy“, jinak výchozí skupina stylu. */
const defaultLayer = (m: Model, fallback: Id): Id =>
  m.display.layers[SECTION_LAYER.id] ? SECTION_LAYER.id : fallback;

/** Kam se pohled dívá (jednotkový vektor od prvního úseku čáry). */
function lookOf(points: readonly Vec2[], direction: SectionDirection): Vec2 {
  const d = norm(sub(points[1] as Vec2, points[0] as Vec2));
  return direction === 'left' ? { x: -d.y, y: d.x } : { x: d.y, y: -d.x };
}

/** Výchozí název: řez podle písmene („Řez A“), pohled podle světové strany fasády („Pohled jižní“). */
function defaultName(m: Model, kind: SectionKind, mark: string, pts: Vec2[], dir: SectionDirection) {
  if (kind === 'section') return `Řez ${mark}`;
  return pts.length >= 2 ? elevationName(m, lookOf(pts, dir)) : `Pohled ${mark}`;
}

/** Nový řez / pohled: styl prvního půdorysu, neomezená hloubka, vzdálená oblast vypnutá (jako Ardit). */
export function newSection(
  m: Model,
  id: Id,
  kind: SectionKind,
  p: SectionShape & { name?: string },
): Section {
  const styleId = p.styleId ?? Object.values(m.views)[0]?.styleId ?? '';
  const style = styleOf(m, styleId);
  const next = kind === 'section' ? nextSectionMark : nextElevationMark;
  const mark = p.mark ?? next(usedMarks(m, kind));
  const points = pointsFrom(p);
  const direction = p.direction ?? 'left';
  if (kind === 'elevation' && points.length !== 2) fail('invalid', 'Pohled má rovnou čáru (2 body)');
  return checkSection(m, {
    id,
    kind,
    name: p.name ?? defaultName(m, kind, mark, points, direction),
    mark,
    points,
    direction,
    depth: p.depth ?? null,
    farClip: p.farClip ?? null,
    presetId: p.presetId ?? null,
    range: p.range ?? null,
    scale: p.scale ?? DEFAULT_SECTION_SCALE,
    styleId,
    local: {},
    elementOverrides: {},
    phaseFilterId: null,
    annotationLayerId: p.annotationLayerId ?? defaultLayer(m, style.defaultAnnotationLayerId),
  });
}
