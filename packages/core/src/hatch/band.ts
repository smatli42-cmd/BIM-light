// Pás přes celou šířku vrstvy (rodina „band“, tepelná izolace): cik-cak s očky u obou líců
// v souřadnicích pásu – s podél osy, a napříč (0 = jeden líc vrstvy, 1 = druhý).
// Jádro ji převede na body modelu podél osy stěny (úsečka i oblouk, základ 23); kresba ji jen ořízne.
import { arcData, pathLength, type Path, type Vec2 } from '../geometry/index.ts';
import type { BandFamily } from './types.ts';

/** Bodů na jednu smyčku. */
const STEPS = 48;
/** Nejvýš tolik smyček na jeden pás (ochrana před zamrznutím u velmi tenké vrstvy). */
export const MAX_BAND_LOOPS = 4000;

/** Bod pásu: s = vzdálenost podél osy (mm), a = poloha napříč (0..1). */
export interface BandPoint {
  readonly s: number;
  readonly a: number;
}

/**
 * Smyčková křivka pásu šířky `width` mezi s0 a s1 (mm podél osy): cik-cak přes celou šířku, v každém
 * otočení u líce malé očko. a(t) = (1 − cos t) / 2, s(t) = width · (c·t − q·sin 2t); q > c/2 vrací
 * křivku u obou líců kousek zpět, takže se překříží (očko hloubky `loop` × šířka).
 */
export function coilCurve(f: BandFamily, width: number, s0: number, s1: number): BandPoint[] {
  if (width <= 0 || s1 <= s0) return [];
  const c = f.pitch / (2 * Math.PI);
  // Křížení očka: a(t0) = loop → cos t0 = 1 − 2·loop; s(t0) = 0 → q = c·t0 / sin 2t0.
  const t0 = Math.acos(Math.min(1, Math.max(-1, 1 - 2 * Math.min(f.loop, 0.45))));
  const q = t0 > 1e-6 ? (c * t0) / Math.sin(2 * t0) : c / 2;
  const period = f.pitch * width;
  const loops = (s1 - s0) / period + 2;
  if (loops > MAX_BAND_LOOPS) return [];
  const tFrom = (s0 / period - 1) * 2 * Math.PI;
  const n = Math.ceil(loops * STEPS);
  const out: BandPoint[] = [];
  for (let i = 0; i <= n; i++) {
    const t = tFrom + (i * 2 * Math.PI) / STEPS;
    out.push({ s: width * (c * t - q * Math.sin(2 * t)), a: (1 - Math.cos(t)) / 2 });
  }
  return out;
}

/** Kde leží pás ve stěně: osa a offsety obou líců vrstvy (mm doleva od směru osy). */
export interface BandFrame {
  readonly path: Path;
  readonly sideA: number;
  readonly sideB: number;
  /** O kolik mm za konce osy křivka pokračuje (rohy po napojení; přebytek ořízne obrys vrstvy). */
  readonly extend: number;
}

/** Bod modelu ve vzdálenosti s podél osy a v offsetu o (oblouk pokračuje i za konce po kružnici). */
function placeOnPath(path: Path, s: number, o: number): Vec2 {
  if (path.kind === 'arc' && Math.abs(path.bulge) > 1e-9) {
    const a = arcData(path);
    const sign = Math.sign(a.sweep);
    const r = sign > 0 ? a.radius - o : a.radius + o;
    const th = Math.atan2(path.start.y - a.center.y, path.start.x - a.center.x) + (sign * s) / a.radius;
    return { x: a.center.x + r * Math.cos(th), y: a.center.y + r * Math.sin(th) };
  }
  const L = Math.hypot(path.end.x - path.start.x, path.end.y - path.start.y) || 1;
  const d = { x: (path.end.x - path.start.x) / L, y: (path.end.y - path.start.y) / L };
  return { x: path.start.x + d.x * s - d.y * o, y: path.start.y + d.y * s + d.x * o };
}

/** Křivka pásu v souřadnicích modelu (jedna lomená čára přes celou délku vrstvy). */
export function bandCurves(f: BandFamily, frame: BandFrame): Vec2[][] {
  const width = Math.abs(frame.sideB - frame.sideA);
  const pts = coilCurve(f, width, -frame.extend, pathLength(frame.path) + frame.extend);
  if (!pts.length) return [];
  const o = (a: number) => frame.sideA + (frame.sideB - frame.sideA) * a;
  return [pts.map((p) => placeOnPath(frame.path, p.s, o(p.a)))];
}
