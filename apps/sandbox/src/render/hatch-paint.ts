// Kreslení šrafy z dat (základ 34): rodiny čar, značek, vlnovek a motivů v rastru se společným počátkem.
// Rozměry jsou mm na papíře, na pixely je převádí `pxPerMm`. Kreslí do již oříznutého kontextu.
import {
  coilCurve,
  motifStrokes,
  type BandFamily,
  type Hatch,
  type HatchFamily,
  type LineFamily,
  type MarkFamily,
  type MotifFamily,
  type Vec2,
  type WaveFamily,
} from '@bim-light/core';
import { snapToPixel } from './line-width.ts';

type Ctx = CanvasRenderingContext2D;

export interface PaintArea {
  /** Obdélník v px, který se má pokrýt. */
  readonly x0: number;
  readonly y0: number;
  readonly x1: number;
  readonly y1: number;
  /** Počátek rastru v px. */
  readonly origin: Vec2;
  readonly pxPerMm: number;
  /**
   * Pás přes šířku vrstvy (rodina „band“) kreslit přes kratší stranu obdélníku (náhledy). Výkres ho
   * nekreslí zde, ale z hotových křivek jádra (`false`).
   */
  readonly bands?: boolean;
  /** Pixely obrazovky na CSS px: vodorovné a svislé čáry se položí do středu pixelu (ostré). */
  readonly pixel?: number;
}

const MAX_ITEMS = 40000;

/** Lokální rámec rodiny: směr osy x (obrazovka má y dolů, úhel je proti směru hodin). */
function frame(angleDeg: number) {
  const a = (angleDeg * Math.PI) / 180;
  const ex = { x: Math.cos(a), y: -Math.sin(a) };
  const ey = { x: -ex.y, y: ex.x };
  return { ex, ey };
}

/** Rozsah obdélníku v lokálních souřadnicích (px) vůči počátku. */
function localRange(area: PaintArea, ex: Vec2, ey: Vec2) {
  const pts = [
    [area.x0, area.y0],
    [area.x1, area.y0],
    [area.x0, area.y1],
    [area.x1, area.y1],
  ].map(([x, y]) => ({ x: (x as number) - area.origin.x, y: (y as number) - area.origin.y }));
  const u = pts.map((p) => p.x * ex.x + p.y * ex.y);
  const v = pts.map((p) => p.x * ey.x + p.y * ey.y);
  return { u0: Math.min(...u), u1: Math.max(...u), v0: Math.min(...v), v1: Math.max(...v) };
}

const at = (area: PaintArea, ex: Vec2, ey: Vec2, u: number, v: number): Vec2 => ({
  x: area.origin.x + ex.x * u + ey.x * v,
  y: area.origin.y + ex.y * u + ey.y * v,
});

/** Vodorovnou nebo svislou úsečku posune do středu pixelu obrazovky; šikmé nechá být. */
function snapAxis(area: PaintArea, a: Vec2, b: Vec2): [Vec2, Vec2] {
  const d = area.pixel;
  if (!d) return [a, b];
  if (Math.abs(a.y - b.y) < 1e-6) {
    const y = snapToPixel(a.y, d);
    return [
      { ...a, y },
      { ...b, y },
    ];
  }
  if (Math.abs(a.x - b.x) < 1e-6) {
    const x = snapToPixel(a.x, d);
    return [
      { ...a, x },
      { ...b, x },
    ];
  }
  return [a, b];
}

function paintLines(ctx: Ctx, f: LineFamily, area: PaintArea) {
  const { ex, ey } = frame(f.angle);
  const s = f.spacing * area.pxPerMm;
  const shift = (f.shift ?? 0) * area.pxPerMm;
  const r = localRange(area, ex, ey);
  if ((r.v1 - r.v0) / s > MAX_ITEMS) return;
  const dash = f.dash.map((d) => d * area.pxPerMm);
  const period = dash.reduce((a, b) => a + b, 0);
  ctx.setLineDash(dash);
  ctx.beginPath();
  for (let k = Math.floor(r.v0 / s); k <= Math.ceil(r.v1 / s); k++) {
    const u0 = r.u0 - ((f.offset * area.pxPerMm * k) % (period || 1));
    const [a, b] = snapAxis(area, at(area, ex, ey, u0, k * s + shift), at(area, ex, ey, r.u1, k * s + shift));
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
  }
  ctx.lineDashOffset = period ? -(r.u0 % period) : 0;
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.lineDashOffset = 0;
}

function shape(ctx: Ctx, f: MarkFamily, c: Vec2, r: number, ex: Vec2, ey: Vec2) {
  const p = (u: number, v: number) => ({ x: c.x + ex.x * u + ey.x * v, y: c.y + ex.y * u + ey.y * v });
  const poly = (pts: Vec2[]) => {
    pts.forEach((q, i) => (i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y)));
    ctx.closePath();
  };
  if (f.shape === 'dot' || f.shape === 'circle') {
    ctx.moveTo(c.x + r, c.y);
    ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
  } else if (f.shape === 'triangle') poly([p(0, r), p(-r * 0.87, -r / 2), p(r * 0.87, -r / 2)]);
  else if (f.shape === 'hexagon')
    poly([0, 1, 2, 3, 4, 5].map((i) => p(r * Math.cos(i * 1.047), r * Math.sin(i * 1.047))));
  else if (f.shape === 'cross') {
    const [a, b, c2, d] = [p(-r, -r), p(r, r), p(-r, r), p(r, -r)];
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.moveTo(c2.x, c2.y);
    ctx.lineTo(d.x, d.y);
  } else {
    const [a, b, l, rr] = [p(-r, 0), p(r, 0), p(r * 0.4, r * 0.5), p(r * 0.4, -r * 0.5)];
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.lineTo(l.x, l.y);
    ctx.moveTo(b.x, b.y);
    ctx.lineTo(rr.x, rr.y);
  }
}

function paintMarks(ctx: Ctx, f: MarkFamily, area: PaintArea) {
  const { ex, ey } = frame(f.angle);
  const [dx, dy, sh] = [f.dx, f.dy, f.rowShift].map((v) => v * area.pxPerMm) as [number, number, number];
  const rg = localRange(area, ex, ey);
  if (((rg.u1 - rg.u0) / dx) * ((rg.v1 - rg.v0) / dy) > MAX_ITEMS) return;
  const r = (f.size * area.pxPerMm) / 2;
  ctx.beginPath();
  for (let j = Math.floor(rg.v0 / dy) - 1; j <= Math.ceil(rg.v1 / dy) + 1; j++) {
    const shift = Math.abs(j) % 2 === 1 ? sh : 0;
    for (let i = Math.floor(rg.u0 / dx) - 1; i <= Math.ceil(rg.u1 / dx) + 1; i++) {
      shape(ctx, f, at(area, ex, ey, i * dx + shift, j * dy), r, ex, ey);
    }
  }
  if (f.shape === 'dot') ctx.fill();
  else ctx.stroke();
}

function paintWave(ctx: Ctx, f: WaveFamily, area: PaintArea) {
  const { ex, ey } = frame(f.angle);
  const [amp, wl, s] = [f.amplitude, f.wavelength, f.spacing].map((v) => v * area.pxPerMm) as [
    number,
    number,
    number,
  ];
  const rg = localRange(area, ex, ey);
  const step = f.form === 'zigzag' ? wl / 2 : wl / 12;
  if (((rg.u1 - rg.u0) / step) * ((rg.v1 - rg.v0) / s) > MAX_ITEMS) return;
  const y = (u: number) =>
    f.form === 'sine'
      ? amp * Math.sin((2 * Math.PI * u) / wl)
      : Math.round((2 * u) / wl) % 2 === 0
        ? -amp
        : amp;
  ctx.beginPath();
  for (let j = Math.floor(rg.v0 / s) - 1; j <= Math.ceil(rg.v1 / s) + 1; j++) {
    const u0 = Math.floor(rg.u0 / wl) * wl;
    for (let u = u0; u <= rg.u1 + wl; u += step) {
      const q = at(area, ex, ey, u, j * s + y(u));
      if (u === u0) ctx.moveTo(q.x, q.y);
      else ctx.lineTo(q.x, q.y);
    }
  }
  ctx.stroke();
}

/** Motiv: lomené čáry z jádra (mm, osa y nahoru) převedené na obrazovku. */
function paintMotif(ctx: Ctx, f: MotifFamily, area: PaintArea) {
  const { ex, ey } = frame(f.angle);
  const k = area.pxPerMm;
  const rg = localRange(area, ex, ey);
  const strokes = motifStrokes(f, { u0: rg.u0 / k, u1: rg.u1 / k, v0: -rg.v1 / k, v1: -rg.v0 / k });
  ctx.beginPath();
  for (const line of strokes) {
    line.forEach((p, i) => {
      const q = at(area, ex, ey, p.x * k, -p.y * k);
      if (i) ctx.lineTo(q.x, q.y);
      else ctx.moveTo(q.x, q.y);
    });
  }
  ctx.stroke();
}

/** Pás přes kratší stranu obdélníku, očka u levého / horního okraje (náhled šrafy a skladby). */
function paintBand(ctx: Ctx, f: BandFamily, area: PaintArea) {
  if (area.bands === false) return;
  const w = area.x1 - area.x0;
  const h = area.y1 - area.y0;
  const across = Math.min(w, h);
  const pts = coilCurve(f, across, 0, Math.max(w, h));
  ctx.beginPath();
  pts.forEach((p, i) => {
    const x = w <= h ? area.x0 + p.a * across : area.x0 + p.s;
    const y = w <= h ? area.y0 + p.s : area.y0 + p.a * across;
    if (i) ctx.lineTo(x, y);
    else ctx.moveTo(x, y);
  });
  ctx.stroke();
}

const PAINT: { [K in HatchFamily['kind']]: (ctx: Ctx, f: never, a: PaintArea) => void } = {
  lines: paintLines,
  marks: paintMarks,
  wave: paintWave,
  motif: paintMotif,
  band: paintBand,
};

/** Nakreslí šrafu do oříznutého kontextu (barvy a tloušťku čar nastaví volající). */
export function paintHatch(ctx: Ctx, hatch: Hatch, area: PaintArea) {
  if (hatch.solid) {
    ctx.fillStyle = ctx.strokeStyle;
    ctx.fillRect(area.x0, area.y0, area.x1 - area.x0, area.y1 - area.y0);
    return;
  }
  ctx.fillStyle = ctx.strokeStyle;
  for (const f of hatch.families)
    (PAINT[f.kind] as (c: Ctx, f: HatchFamily, a: PaintArea) => void)(ctx, f, area);
}
