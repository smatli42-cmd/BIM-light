// Pomocné výpočty v px: text nad čarou (čitelný zdola a zprava), obdélníky, vzdálenost k úsečce.
import type { Vec2 } from '@bim-light/core';

export interface ScreenRect {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

/** Šířka textu (odhad pro neproporcionální písmo; stejný v kreslení i v zásahu myší). */
export const textWidth = (text: string, px: number) => text.length * px * 0.62 + 4;

export interface ScreenText {
  readonly at: Vec2;
  /** Natočení textu v px souřadnicích (radiány, čitelné zdola a zprava). */
  readonly angle: number;
  /** Jednotkový směr textu. */
  readonly dir: Vec2;
  readonly width: number;
  readonly rect: ScreenRect;
}

/** Text nad čarou a–b (na obrazovce osa y jde dolů). */
export function screenText(a: Vec2, b: Vec2, text: string, px: number, gap: number): ScreenText {
  let angle = Math.atan2(b.y - a.y, b.x - a.x);
  if (angle > Math.PI / 2 + 1e-9) angle -= Math.PI;
  if (angle <= -Math.PI / 2 + 1e-9) angle += Math.PI;
  const dir = { x: Math.cos(angle), y: Math.sin(angle) };
  const up = { x: dir.y, y: -dir.x };
  const m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  const at = { x: m.x + up.x * gap, y: m.y + up.y * gap };
  const width = textWidth(text, px);
  return { at, angle, dir, width, rect: rotatedBox(at, dir, width, px + 4) };
}

/** Osově rovnoběžný obdélník kolem natočeného obdélníku. */
export function rotatedBox(c: Vec2, dir: Vec2, w: number, h: number): ScreenRect {
  const hw = (Math.abs(dir.x) * w + Math.abs(dir.y) * h) / 2;
  const hh = (Math.abs(dir.y) * w + Math.abs(dir.x) * h) / 2;
  return { x: c.x - hw, y: c.y - hh, w: hw * 2, h: hh * 2 };
}

export const inRect = (p: Vec2, r: ScreenRect) =>
  p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;

export function segDist(p: Vec2, a: Vec2, b: Vec2): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const l2 = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2));
  return Math.hypot(p.x - (a.x + dx * t), p.y - (a.y + dy * t));
}

export const near = (p: Vec2, q: Vec2, r: number) => Math.hypot(p.x - q.x, p.y - q.y) <= r;
