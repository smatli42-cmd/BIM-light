// Kresba místnosti v půdorysu (prvky stavby 9, katalog pohledů: číslo, název, plocha; výplň volitelně).
// Razítko = řádky textu podle údajů razítka stylu pohledu (`stamp.ts`), velikost písma pevná na papíře
// (základ 29), barva, pero a výplň vždy z funkce grafiky (základy 11, 30): výplň dá barva kategorie
// (patro 1), styl, pravidlo nebo přepis místnosti. Neuzavřená místnost ukáže varování místo ploch.
import type { Primitive } from '../drawing/primitives.ts';
import { add, type Vec2 } from '../geometry/index.ts';
import type { ElementFacts } from '../style/conditions.ts';
import { variantKey } from '../style/conditions.ts';
import type { PaperSizes, ResolvedEffect } from '../style/types.ts';
import type { RoomGeometry } from './geometry.ts';
import type { Model } from '../model/types.ts';
import { stampValue, type RoomStampField } from './stamp.ts';
import type { Room } from './types.ts';

/** Řádkování razítka vůči výšce písma. */
const LINE = 1.6;

/** Fakta o místnosti pro funkci grafiky; barva kategorie je výchozí výplň (patro 1). */
export function roomFacts(model: Model, r: Room): ElementFacts {
  const cat = model.roomCategories[r.categoryId ?? ''];
  const f = {
    roomCategory: r.categoryId ?? '',
    ...(cat && { ownDefault: { fillColor: cat.color } }),
    id: r.id,
    category: 'room' as const,
    discipline: r.discipline,
    status: r.status,
    variant: variantKey(r.variant),
    typeId: '',
    materialIds: [],
  };
  return r.graphicOverride ? { ...f, graphicOverride: r.graphicOverride } : f;
}

const STATE_TEXT: Readonly<Record<RoomGeometry['state'], string | null>> = {
  ok: null,
  'not-enclosed': 'neuzavřená',
  'in-wall': 'bod ve stěně',
  redundant: 'nadbytečná',
};

/** Údaje spočítané z obrysu – u neuzavřené místnosti je nahradí varování. */
const MEASURED: readonly RoomStampField[] = ['area', 'livingArea', 'utilityArea', 'perimeter', 'volume'];

/** Řádky razítka podle údajů razítka stylu (v pořadí, prázdné vynechá). */
export function stampLines(
  model: Model,
  r: Room,
  g: RoomGeometry,
  fields: readonly RoomStampField[],
): string[] {
  const warn = STATE_TEXT[g.state];
  const lines = fields
    .filter((f) => !warn || !MEASURED.includes(f))
    .map((f) => stampValue(model, r, g, f))
    .filter((t): t is string => !!t);
  return warn ? [...lines, warn] : lines;
}

/** Střed razítka (mm modelu). */
export const stampCenter = (r: Room): Vec2 => r.stampAt ?? r.seed;

/** Obdélník razítka v modelu (pro výběr a tažení): střed, poloviční šířka a výška (mm). */
export function stampBox(lines: readonly string[], scale: number, paper: PaperSizes) {
  const h = paper.labelText * scale;
  const longest = Math.max(1, ...lines.map((l) => l.length));
  return { halfW: (longest * h * 0.6) / 2, halfH: (lines.length * h * LINE) / 2 };
}

export function drawRoom(
  model: Model,
  r: Room,
  g: RoomGeometry,
  scale: number,
  fields: readonly RoomStampField[],
  eff: ResolvedEffect,
): Primitive[] {
  const paper = model.display.paperSizes;
  if (!eff.visible) return [];
  const source = (role: string) => ({ elementId: r.id, role });
  const out: Primitive[] = [];
  if (eff.fillColor && g.outline.length) {
    // Ostrovy (sloupy, komíny) jsou stěny – kreslí se přes výplň.
    out.push({
      kind: 'fill',
      polygon: g.outline,
      color: eff.fillColor,
      transparency: eff.transparency,
      source: source('výplň místnosti'),
    });
  }
  const lines = stampLines(model, r, g, fields);
  const step = paper.labelText * scale * LINE;
  const c = stampCenter(r);
  lines.forEach((text, i) => {
    const dy = ((lines.length - 1) / 2 - i) * step;
    out.push({
      kind: 'text',
      at: add(c, { x: 0, y: dy }),
      text,
      heightMm: paper.labelText,
      angle: 0,
      color: eff.lineColor,
      source: source(i === 0 ? 'číslo místnosti' : 'razítko místnosti'),
    });
  });
  return out;
}
