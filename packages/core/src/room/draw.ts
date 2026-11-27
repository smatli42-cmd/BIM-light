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

/** Řádek razítka: text a zda je to číslo místnosti (větší písmo, tučně). */
export interface StampLine {
  readonly text: string;
  readonly number: boolean;
}

/** Řádky razítka podle údajů razítka stylu (v pořadí, prázdné vynechá). */
export function stampLines(
  model: Model,
  r: Room,
  g: RoomGeometry,
  fields: readonly RoomStampField[],
): StampLine[] {
  const warn = STATE_TEXT[g.state];
  const lines = fields
    .filter((f) => !warn || !MEASURED.includes(f))
    .map((f) => ({ text: stampValue(model, r, g, f) ?? '', number: f === 'number' }))
    .filter((l) => !!l.text);
  return warn ? [...lines, { text: warn, number: false }] : lines;
}

/** Střed razítka (mm modelu). */
export const stampCenter = (r: Room): Vec2 => r.stampAt ?? r.seed;

/** Výška písma řádku na papíře (mm): číslo, ostatní řádky (paperSizes, základ 29). */
const textMm = (l: StampLine, paper: PaperSizes) => (l.number ? paper.roomNumberText : paper.roomText);

/** Rozložení razítka v modelu: posun každého řádku od středu (mm) a poloviční šířka a výška. */
export function stampLayout(lines: readonly StampLine[], scale: number, paper: PaperSizes) {
  const rows = lines.map((l) => textMm(l, paper) * scale * paper.roomLineSpacing);
  const total = rows.reduce((a, h) => a + h, 0);
  let top = total / 2;
  const dy = rows.map((h) => {
    const y = top - h / 2;
    top -= h;
    return y;
  });
  const widths = lines.map((l) => l.text.length * textMm(l, paper) * scale * 0.6);
  return { dy, halfW: Math.max(0, ...widths) / 2, halfH: total / 2 };
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
  const lay = stampLayout(lines, scale, paper);
  const c = stampCenter(r);
  lines.forEach((l, i) => {
    out.push({
      kind: 'text',
      at: add(c, { x: 0, y: lay.dy[i] ?? 0 }),
      text: l.text,
      heightMm: textMm(l, paper),
      angle: 0,
      ...(l.number && { bold: true }),
      color: eff.lineColor,
      source: source(l.number ? 'číslo místnosti' : 'razítko místnosti'),
    });
  });
  return out;
}
