// Rozložení kóty v půdorysu: kótovací čára, odkazové čáry, místo pro číslo.
// Velikosti značek a mezer jsou na papíře (základ 29): do mm modelu se násobí měřítkem.
import {
  add,
  angleOf,
  arcData,
  carrierOf,
  dist,
  endPoint,
  leftNormal,
  mul,
  nearestOnPath,
  norm,
  offsetPath,
  pointAt,
  projectOnCarrier,
  rotate,
  sub,
  tangentAt,
  tessellate,
  type Path,
  type Vec2,
} from '../geometry/index.ts';
import type { Model } from '../model/types.ts';
import type { PaperSizes } from '../style/types.ts';
import { arcLine, measuredFace } from './arc-dim.ts';
import { angleGeometry, facePath, isArcPath } from './measure.ts';
import type { AngularDimension, Dimension, LengthDimension, LinearDimension } from './types.ts';

export interface DimensionLayout {
  /** Kótovací čára (u úhlové kóty oblouk rozložený na body). */
  readonly line: readonly Vec2[];
  /** Body pro značky (šikmé čárky) a směr čáry v nich. */
  readonly ticks: readonly { readonly at: Vec2; readonly dir: Vec2 }[];
  readonly extensions: readonly (readonly [Vec2, Vec2])[];
  /** Střed čísla a natočení (čitelné zdola a zprava). */
  readonly textAt: Vec2;
  readonly textAngle: number;
}

/** Natočení textu tak, aby se četl zdola nebo zprava. */
export function readableAngle(dir: Vec2): number {
  let a = angleOf(dir);
  if (a > Math.PI / 2 + 1e-9) a -= Math.PI;
  if (a <= -Math.PI / 2 + 1e-9) a += Math.PI;
  return a;
}

function extension(from: Vec2, to: Vec2, gap: number, over: number): [Vec2, Vec2] | null {
  const l = dist(from, to);
  if (l <= gap) return null;
  const d = norm(sub(to, from));
  return [add(from, mul(d, gap)), add(to, mul(d, over))];
}

function textPlace(a: Vec2, b: Vec2, k: number, paper: PaperSizes) {
  const angle = readableAngle(sub(b, a));
  const up = leftNormal({ x: Math.cos(angle), y: Math.sin(angle) });
  const m = mul(add(a, b), 0.5);
  return {
    textAt: add(m, mul(up, (paper.dimensionTextGap + paper.dimensionText / 2) * k)),
    textAngle: angle,
  };
}

function straight(a: Vec2, b: Vec2, ext: [Vec2, Vec2][], k: number, paper: PaperSizes): DimensionLayout {
  const dir = norm(sub(b, a));
  return {
    line: [a, b],
    ticks: [
      { at: a, dir },
      { at: b, dir },
    ],
    extensions: ext,
    ...textPlace(a, b, k, paper),
  };
}

type Ext = (f: Vec2, t: Vec2) => [Vec2, Vec2] | null;
const kept = (e: [Vec2, Vec2] | null): e is [Vec2, Vec2] => e !== null;

function arcLayout(model: Model, d: LinearDimension, ext: Ext, k: number, paper: PaperSizes) {
  const face = d.arc && measuredFace(model, d.arc);
  const l = face && arcLine(face, [facePath(model, d.refs[0]), facePath(model, d.refs[1])], d.offset);
  if (!l) return null;
  const mid = l.line[Math.floor(l.line.length / 2)] as Vec2;
  const radial = norm(sub(mid, l.center));
  const tangent = leftNormal(radial);
  const ticks = l.to.map((q) => ({ at: q, dir: leftNormal(norm(sub(q, l.center))) }));
  return {
    line: l.line,
    ticks,
    extensions: [ext(l.from[0], l.to[0]), ext(l.from[1], l.to[1])].filter(kept),
    textAt: add(mid, mul(radial, (paper.dimensionTextGap + paper.dimensionText / 2) * k)),
    textAngle: readableAngle(tangent),
  };
}

/** Body na kótovací čáře (base, pB) a body líců nejblíž čáře (sA, sB) – odkud vedou odkazové čáry. */
function anchors(model: Model, d: LinearDimension) {
  const fa = facePath(model, d.refs[0]);
  const base = add(pointAt(fa, 0.5), mul(tangentAt(fa, 'start'), d.offset));
  const fb = facePath(model, d.refs[1]);
  const pB = projectOnCarrier(base, carrierOf(fb));
  // Odkazová čára začíná v bodě líce nejblíž kótovací čáře (u konce líce), ne uprostřed líce – jinak by
  // kóta k líci kolmé stěny (kóta celé stěny) táhla čáru přes celý dům (oprava 2026-11-26).
  const [sA, sB] = [nearestOnPath(fa, base).point, nearestOnPath(fb, pB).point];
  return { base, pB, sA, sB, reach: Math.min(dist(sA, base), dist(sB, pB)) };
}

/**
 * Jak daleko od kótovací čáry začínají odkazové čáry celé řady (skupina zarovnání): u nejbližšího
 * kótovaného místa řady. Řada kót celé stěny s příčkami pak má všechny odkazové čáry stejně dlouhé –
 * končí u líce kótované stěny, ne za ní (hlášení uživatele 2026-11-26). 0 = řada kótovanou věc protíná.
 */
function rowReach(model: Model, d: LinearDimension, own: number): number {
  if (!d.alignGroupId) return own;
  const row = Object.values(model.dimensions).filter(
    (x): x is LinearDimension =>
      x.kind === 'linear' && !x.arc && x.alignGroupId === d.alignGroupId && x.id !== d.id,
  );
  return Math.min(own, ...row.map((x) => anchors(model, x).reach));
}

function linearLayout(model: Model, d: LinearDimension, ext: Ext, k: number, paper: PaperSizes) {
  if (d.arc) return arcLayout(model, d, ext, k, paper);
  const { base, pB, sA, sB, reach } = anchors(model, d);
  const t = rowReach(model, d, reach);
  const from = (s: Vec2, on: Vec2) => (t > 1 && dist(s, on) > t ? add(on, mul(norm(sub(s, on)), t)) : s);
  return straight(base, pB, [ext(from(sA, base), base), ext(from(sB, pB), pB)].filter(kept), k, paper);
}

/** Tětiva oblouku: čára rovnoběžná s tětivou, odsazená o `offset` doleva. */
function chordLayout(face: Path, d: LengthDimension, ext: Ext, k: number, paper: PaperSizes) {
  const n = mul(leftNormal(norm(sub(face.end, face.start))), d.offset);
  const [a, b] = [add(face.start, n), add(face.end, n)];
  return straight(a, b, [ext(face.start, a), ext(face.end, b)].filter(kept), k, paper);
}

/** Poloměr: čára ze středu k bodu uprostřed líce, značka jen na líci. */
function radiusLayout(face: Path, k: number, paper: PaperSizes): DimensionLayout | null {
  if (!isArcPath(face)) return null;
  const c = arcData(face).center;
  const p = pointAt(face, 0.5);
  return { ...straight(c, p, [], k, paper), ticks: [{ at: p, dir: norm(sub(p, c)) }] };
}

function lengthLayout(model: Model, d: LengthDimension, ext: Ext, k: number, paper: PaperSizes) {
  const face = facePath(model, d.ref);
  if (d.measure === 'chord') return chordLayout(face, d, ext, k, paper);
  if (d.measure === 'radius') return radiusLayout(face, k, paper);
  const line = offsetPath(face, d.offset);
  const exts = (['start', 'end'] as const).map((e) => ext(endPoint(face, e), endPoint(line, e))).filter(kept);
  return {
    ...straight(line.start, line.end, exts, k, paper),
    line: tessellate(line),
    ticks: [
      { at: line.start, dir: tangentAt(line, 'start') },
      { at: line.end, dir: tangentAt(line, 'end') },
    ],
  };
}

function angularLayout(
  model: Model,
  d: AngularDimension,
  k: number,
  paper: PaperSizes,
): DimensionLayout | null {
  const g = angleGeometry(model, d.wallIds);
  if (!g) return null;
  const [da, db] = g.dirs;
  const a0 = add(g.vertex, mul(da, d.radius));
  const sweep = Math.atan2(da.x * db.y - da.y * db.x, da.x * db.x + da.y * db.y);
  const n = 24;
  const line = Array.from({ length: n + 1 }, (_, i) => rotate(a0, g.vertex, (sweep * i) / n));
  const bis = norm(add(da, db));
  const textAt = add(g.vertex, mul(bis, d.radius + (paper.dimensionTextGap + paper.dimensionText / 2) * k));
  const tangent = (p: Vec2) => leftNormal(norm(sub(p, g.vertex)));
  const first = line[0] ?? a0;
  const last = line[n] ?? a0;
  return {
    line,
    ticks: [
      { at: first, dir: tangent(first) },
      { at: last, dir: tangent(last) },
    ],
    extensions: [],
    textAt,
    textAngle: readableAngle(leftNormal(bis)),
  };
}

/** Rozložení kóty pro dané měřítko. */
export function layoutDimension(
  model: Model,
  d: Dimension,
  scale: number,
  paper: PaperSizes,
): DimensionLayout | null {
  const ext: Ext = (f, t) => extension(f, t, paper.extensionGap * scale, paper.extensionOvershoot * scale);
  if (d.kind === 'linear') return linearLayout(model, d, ext, scale, paper);
  if (d.kind === 'length') return lengthLayout(model, d, ext, scale, paper);
  return angularLayout(model, d, scale, paper);
}
