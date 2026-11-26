// Pomocné značky přes výkres: světle modré [R, katalog kreslení 2] – přichycení, pomocné čáry,
// uzly, dočasné kóty, zámky a kolečka. Jsou to prvky rozhraní, ne kresba modelu.
import {
  allWallGeometry,
  edgePath,
  facePath,
  openingOutline,
  tessellate,
  type Id,
  type Vec2,
  type Model,
} from '@bim-light/core';
import type { Session } from '../session/session.ts';
import type { GripView, PermDimView } from '../interaction/hits.ts';
import type { TempDimView } from '../interaction/temp-layout.ts';
import type { Overlay } from '../interaction/types.ts';

export const AUX = '#2b8cff';
export const AUX_LIGHT = '#8cc6ff';
export const SELECT = '#1565c0';
export const FLASH = '#c62828';

type Ctx = CanvasRenderingContext2D;

function seg(ctx: Ctx, a: Vec2, b: Vec2) {
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
}

function poly(ctx: Ctx, s: Session, pts: readonly Vec2[], closed = true) {
  ctx.beginPath();
  pts.forEach((p, i) => {
    const q = s.viewport.toScreen(p);
    if (i === 0) ctx.moveTo(q.x, q.y);
    else ctx.lineTo(q.x, q.y);
  });
  if (closed) ctx.closePath();
}

/** Obrysy stěn a otvorů (výběr, zvýraznění pod kurzorem). */
export function drawWallOutlines(
  ctx: Ctx,
  s: Session,
  ids: readonly Id[],
  color: string,
  width: number,
  model: Model = s.model,
) {
  const geoms = allWallGeometry(model, s.storeyId, s.view.cutPlane);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  for (const id of ids) {
    const o = model.openings[id];
    if (o) {
      poly(ctx, s, openingOutline(model, o));
      ctx.stroke();
      continue;
    }
    const g = geoms.get(id);
    if (!g) continue;
    for (const loop of g.outlines) {
      poly(ctx, s, loop);
      ctx.stroke();
    }
  }
}

function drawSnap(ctx: Ctx, s: Session, o: Overlay) {
  if (!o.snap) return;
  const p = s.viewport.toScreen(o.snap.point);
  ctx.strokeStyle = AUX;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(p.x - 5, p.y - 5, 10, 10);
  if (!o.snap.label) return;
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillStyle = AUX;
  ctx.fillText(o.snap.label, p.x + 10, p.y - 10);
}

export function drawOverlay(ctx: Ctx, s: Session, o: Overlay) {
  const v = s.viewport;
  if (o.hover?.length) drawWallOutlines(ctx, s, o.hover, AUX_LIGHT, 1.5);
  ctx.strokeStyle = AUX;
  ctx.lineWidth = 1;
  for (const g of o.ghosts ?? []) {
    poly(ctx, s, g);
    ctx.fillStyle = 'rgba(43,140,255,0.12)';
    ctx.fill();
    ctx.stroke();
  }
  ctx.setLineDash([2, 3]);
  ctx.strokeStyle = AUX_LIGHT;
  for (const [a, b] of o.guides ?? []) seg(ctx, v.toScreen(a), v.toScreen(b));
  ctx.setLineDash([]);
  ctx.strokeStyle = AUX;
  for (const [a, b] of o.lines ?? []) seg(ctx, v.toScreen(a), v.toScreen(b));
  for (const m of o.markers ?? []) {
    const p = v.toScreen(m);
    seg(ctx, { x: p.x - 6, y: p.y }, { x: p.x + 6, y: p.y });
    seg(ctx, { x: p.x, y: p.y - 6 }, { x: p.x, y: p.y + 6 });
  }
  const geoms = allWallGeometry(s.model, s.storeyId);
  ctx.lineWidth = 3;
  for (const f of o.faces ?? []) {
    const g = geoms.get(f.wallId);
    const path = f.openingId ? facePath(s.model, f) : g ? edgePath(g, f.face) : undefined;
    if (!path) continue;
    poly(ctx, s, tessellate(path), false);
    ctx.stroke();
  }
  drawSnap(ctx, s, o);
  if (o.box) {
    const { a, b, crossing } = o.box;
    ctx.lineWidth = 1;
    ctx.setLineDash(crossing ? [5, 3] : []);
    ctx.fillStyle = crossing ? 'rgba(76,175,80,0.08)' : 'rgba(43,140,255,0.08)';
    ctx.fillRect(Math.min(a.x, b.x), Math.min(a.y, b.y), Math.abs(b.x - a.x), Math.abs(b.y - a.y));
    ctx.strokeRect(Math.min(a.x, b.x), Math.min(a.y, b.y), Math.abs(b.x - a.x), Math.abs(b.y - a.y));
    ctx.setLineDash([]);
  }
}

function tick(ctx: Ctx, at: Vec2, dir: Vec2) {
  const c = Math.SQRT1_2;
  const t = { x: (dir.x - dir.y) * c, y: (dir.y + dir.x) * c };
  seg(ctx, { x: at.x - t.x * 5, y: at.y - t.y * 5 }, { x: at.x + t.x * 5, y: at.y + t.y * 5 });
}

/** Dočasná kóta podle ČSN, světle modrá; číslo bez rámečku nad čarou. */
export function drawTempDim(ctx: Ctx, t: TempDimView) {
  ctx.strokeStyle = AUX;
  ctx.fillStyle = AUX;
  ctx.lineWidth = 1;
  for (const [a, b] of t.ext) seg(ctx, a, b);
  seg(ctx, t.a, t.b);
  const l = Math.hypot(t.b.x - t.a.x, t.b.y - t.a.y) || 1;
  const dir = { x: (t.b.x - t.a.x) / l, y: (t.b.y - t.a.y) / l };
  ctx.lineWidth = 1.6;
  tick(ctx, t.a, dir);
  tick(ctx, t.b, dir);
  ctx.save();
  ctx.translate(t.textAt.x, t.textAt.y);
  ctx.rotate(t.angle);
  ctx.font = '500 12px ui-monospace, monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(t.text, 0, 0);
  ctx.restore();
  if (t.pin) drawPin(ctx, t.pin);
  if (t.lenEnd) drawTriangle(ctx, t.lenEnd, dir);
}

function drawPin(ctx: Ctx, p: Vec2) {
  ctx.lineWidth = 1.5;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(p.x, p.y, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  seg(ctx, { x: p.x - 3.5, y: p.y }, { x: p.x + 3.5, y: p.y });
  seg(ctx, { x: p.x, y: p.y - 3.5 }, { x: p.x, y: p.y + 3.5 });
}

function drawTriangle(ctx: Ctx, p: Vec2, dir: Vec2) {
  ctx.fillStyle = AUX;
  ctx.beginPath();
  ctx.moveTo(p.x - dir.y * 5, p.y + dir.x * 5);
  ctx.lineTo(p.x + dir.y * 5, p.y - dir.x * 5);
  ctx.lineTo(p.x + dir.x * 7, p.y + dir.y * 7);
  ctx.closePath();
  ctx.fill();
}

/** Zámek u čísla trvalé kóty (světle modrý; plný = zamčeno). */
export function drawLock(ctx: Ctx, d: PermDimView, flash: boolean) {
  const { x, y } = d.lock;
  const col = flash ? FLASH : AUX;
  ctx.strokeStyle = col;
  ctx.fillStyle = d.locked ? col : '#ffffff';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.rect(x - 5, y - 1, 10, 7);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x, y - 1, 3.5, Math.PI, d.locked ? 0 : Math.PI * 1.75);
  ctx.stroke();
}

/** Dvojitá šipka překlopení: krátká úsečka kolmo na stěnu s hroty na obou koncích. */
function drawFlipArrows(ctx: Ctx, at: Vec2, d: Vec2) {
  const L = 9;
  const n = { x: -d.y, y: d.x };
  const a = { x: at.x - d.x * L, y: at.y - d.y * L };
  const b = { x: at.x + d.x * L, y: at.y + d.y * L };
  ctx.save();
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(at.x, at.y, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  for (const [p, s] of [
    [a, 1],
    [b, -1],
  ] as const) {
    ctx.moveTo(p.x + (d.x * 4 + n.x * 3.5) * s, p.y + (d.y * 4 + n.y * 3.5) * s);
    ctx.lineTo(p.x, p.y);
    ctx.lineTo(p.x + (d.x * 4 - n.x * 3.5) * s, p.y + (d.y * 4 - n.y * 3.5) * s);
  }
  ctx.stroke();
  ctx.restore();
}

export function drawGrips(ctx: Ctx, grips: readonly GripView[]) {
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = AUX;
  ctx.lineWidth = 1.5;
  for (const g of grips) {
    if (g.end === 'flip') {
      drawFlipArrows(ctx, g.at, g.dir ?? { x: 0, y: -1 });
      continue;
    }
    if (g.end === 'mid') {
      ctx.beginPath();
      ctx.arc(g.at.x, g.at.y, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      continue;
    }
    ctx.fillRect(g.at.x - 4, g.at.y - 4, 8, 8);
    ctx.strokeRect(g.at.x - 4, g.at.y - 4, 8, 8);
  }
}
