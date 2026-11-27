// Tracker obdélníku (desky D2/D3, Revit „Obdélník“ / Archicad „Pravoúhlý“): po prvním rohu se píše šířka
// (X) a hloubka (Y), Tab přepíná; znaménko podle strany kurzoru. U natočeného obdélníku po hraně šířka
// kolmo k ní, také na stranu kurzoru. Napsané číslo má přednost před přichycením (katalog kreslení 2.5).
import { add, dot, leftNormal, mul, norm, sub, type Vec2 } from '../geometry/index.ts';
import { parseNumber } from './tracker.ts';

export interface RectInput {
  /** Napsaná šířka ve směru X (text), prázdné = podle myši. */
  readonly width: string;
  /** Napsaná hloubka ve směru Y (text), prázdné = podle myši. */
  readonly depth: string;
}

export interface RectTrackerResult {
  /** Protější roh. */
  readonly point: Vec2;
  /** Šířka a hloubka (kladné, mm). */
  readonly width: number;
  readonly depth: number;
  readonly typed: boolean;
}

const typedValue = (text: string): number | null => {
  const v = parseNumber(text);
  return text !== '' && Number.isFinite(v) && v > 0 ? v : null;
};

const side = (v: number) => (v < 0 ? -1 : 1);

/** Protější roh obdélníku z prvního rohu `a`, polohy myši a napsaných čísel. */
export function rectTrackerPoint(a: Vec2, mouse: Vec2, input: RectInput): RectTrackerResult {
  const w = typedValue(input.width);
  const d = typedValue(input.depth);
  const x = w === null ? mouse.x : a.x + side(mouse.x - a.x) * w;
  const y = d === null ? mouse.y : a.y + side(mouse.y - a.y) * d;
  return {
    point: { x, y },
    width: Math.abs(x - a.x),
    depth: Math.abs(y - a.y),
    typed: w !== null || d !== null,
  };
}

export interface RotatedWidthResult {
  /** Bod na protější straně (kolmo nad koncem hrany). */
  readonly point: Vec2;
  /** Šířka kolmo k první hraně (kladná, mm). */
  readonly width: number;
  readonly typed: boolean;
}

/** Šířka natočeného obdélníku nad hranou a–b: myší, nebo napsaná na stranu kurzoru. */
export function rotatedWidthPoint(a: Vec2, b: Vec2, mouse: Vec2, width: string): RotatedWidthResult {
  const n = leftNormal(norm(sub(b, a)));
  const h = dot(sub(mouse, a), n);
  const w = typedValue(width);
  if (w === null) return { point: mouse, width: Math.abs(h), typed: false };
  return { point: add(b, mul(n, side(h) * w)), width: w, typed: true };
}
