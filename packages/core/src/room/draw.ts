// Kresba místnosti v půdorysu (prvky stavby 9, katalog pohledů: číslo, název, plocha; výplň volitelně).
// Razítko = řádky textu podle stylu pohledu (labels.roomNumber / roomName / roomArea), velikost písma
// pevná na papíře (základ 29), barva, pero a výplň vždy z funkce grafiky (základy 11, 30): výchozí
// grafika výplň nemá, barevnou výplň zapne pravidlo nebo styl. Neuzavřená místnost ukáže varování.
import type { Primitive } from '../drawing/primitives.ts';
import { add, type Vec2 } from '../geometry/index.ts';
import type { ElementFacts } from '../style/conditions.ts';
import { variantKey } from '../style/conditions.ts';
import type { PaperSizes, ResolvedEffect } from '../style/types.ts';
import type { RoomGeometry } from './geometry.ts';
import { areaText } from './queries.ts';
import type { Room } from './types.ts';

/** Řádkování razítka vůči výšce písma. */
const LINE = 1.6;

export function roomFacts(r: Room): ElementFacts {
  const f = {
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

/** Řádky razítka podle voleb stylu (chybějící volba = zapnuto). */
export function stampLines(r: Room, g: RoomGeometry, labels: Readonly<Record<string, boolean>>): string[] {
  const on = (k: string) => labels[k] !== false;
  const warn = STATE_TEXT[g.state];
  return [
    ...(on('roomNumber') ? [r.number] : []),
    ...(on('roomName') && r.name ? [r.name] : []),
    ...(warn ? [warn] : on('roomArea') ? [areaText(g.area)] : []),
  ];
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
  r: Room,
  g: RoomGeometry,
  scale: number,
  paper: PaperSizes,
  labels: Readonly<Record<string, boolean>>,
  eff: ResolvedEffect,
): Primitive[] {
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
  const lines = stampLines(r, g, labels);
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
