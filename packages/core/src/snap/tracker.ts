// Tracker u kurzoru (katalog kreslení 1): délka a úhel vůči předchozí stěně.
// Úhel 180° = rovně, 90° = zatáčka doprava, 270° = doleva [R]; první stěna řetězu od osy X.
import { add, len, mul, sub, type Vec2 } from '../geometry/index.ts';

const DEG = 180 / Math.PI;

const wrap360 = (d: number) => ((d % 360) + 360) % 360;

/** Úhel zobrazený v trackeru (stupně 0–360). */
export function relativeAngleDeg(dir: number, prevDir: number | null): number {
  return wrap360(prevDir === null ? dir * DEG : 180 + (dir - prevDir) * DEG);
}

/** Směr (radiány) ze zadaného úhlu v trackeru. */
export function directionFromRelative(angleDeg: number, prevDir: number | null): number {
  return prevDir === null ? angleDeg / DEG : prevDir + (angleDeg - 180) / DEG;
}

/** Číslo zadané uživatelem: čárka i tečka jako desetinná, mezery se ignorují. NaN = neplatné. */
export function parseNumber(text: string): number {
  const t = text.replace(/\s/g, '').replace(',', '.');
  if (!/^[-+]?\d*\.?\d+$/.test(t)) return Number.NaN;
  return Number(t);
}

export interface TrackerInput {
  /** Napsaná délka (text), prázdné = podle myši. */
  readonly length: string;
  /** Napsaný úhel (text), prázdné = podle myši. */
  readonly angle: string;
}

export interface TrackerResult {
  readonly point: Vec2;
  readonly length: number;
  /** Směr v radiánech. */
  readonly dir: number;
  /** Úhel pro tracker (stupně vůči předchozí stěně). */
  readonly angleDeg: number;
  /** Bylo použito napsané číslo (přesné, bez přichycení, katalog 2.5). */
  readonly typed: boolean;
}

/** Koncový bod stěny z bodu myši (už přichyceného) a napsaných čísel. */
export function trackerPoint(
  from: Vec2,
  mouse: Vec2,
  prevDir: number | null,
  input: TrackerInput,
): TrackerResult {
  const v = sub(mouse, from);
  let l = len(v);
  let dir = l > 0.5 ? Math.atan2(v.y, v.x) : (prevDir ?? 0);
  const a = parseNumber(input.angle);
  const tl = parseNumber(input.length);
  const hasA = input.angle !== '' && Number.isFinite(a);
  const hasL = input.length !== '' && Number.isFinite(tl) && tl > 0;
  if (hasA) dir = directionFromRelative(a, prevDir);
  if (hasL) l = tl;
  const point = hasA || hasL ? add(from, mul({ x: Math.cos(dir), y: Math.sin(dir) }, l)) : mouse;
  return { point, length: l, dir, angleDeg: relativeAngleDeg(dir, prevDir), typed: hasA || hasL };
}
