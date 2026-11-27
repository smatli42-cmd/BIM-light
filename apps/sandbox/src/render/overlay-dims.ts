// Značky kót přes výkres (světle modré, katalog kreslení 4): dočasná kóta s číslem, špendlík,
// trojúhelník délky a zámek trvalé kóty. Rozděleno z overlay.ts (základ 33).
import type { Vec2 } from '@bim-light/core';
import type { PermDimView } from '../interaction/hits.ts';
import type { TempDimView } from '../interaction/temp-layout.ts';
import { uiPx } from '../session/ui-scale.ts';
import { AUX, FLASH, seg, type Ctx } from './overlay.ts';

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
  ctx.font = `500 ${uiPx(12)}px ui-monospace, monospace`;
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
