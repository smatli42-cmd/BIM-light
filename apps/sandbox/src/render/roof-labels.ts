// Čísla hran a sklony vybrané střechy v půdorysu (hlášení uživatele 2026-11-28): u každé hrany obrysu
// štítek „1 · 45°“ / „2 · štít“ za okapem (číslo jako v info boxu) se šipkou ve směru stoupání roviny
// a referenční čára čárkovaně. Jen pomůcka rozhraní, data i výpočet z jádra (roofGeometry).
import { findRoof, roofGeometry, type Model, type Vec2 } from '@bim-light/core';
import { uiPx } from '../session/ui-scale.ts';
import type { Session } from '../session/session.ts';
import { AUX, SELECT, type Ctx } from './overlay.ts';

const deg = (v: number) => `${Number.isInteger(v) ? v : v.toFixed(1).replace('.', ',')}°`;

function tag(ctx: Ctx, at: Vec2, text: string) {
  const h = uiPx(18);
  const w = ctx.measureText(text).width + uiPx(10);
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = SELECT;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(at.x - w / 2, at.y - h / 2, w, h, uiPx(4));
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = SELECT;
  ctx.fillText(text, at.x, at.y + uiPx(0.5));
}

function arrow(ctx: Ctx, from: Vec2, dir: Vec2) {
  const len = uiPx(16);
  const to = { x: from.x + dir.x * len, y: from.y + dir.y * len };
  const side = { x: -dir.y, y: dir.x };
  const k = uiPx(4);
  ctx.strokeStyle = SELECT;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.moveTo(to.x - dir.x * k + side.x * k, to.y - dir.y * k + side.y * k);
  ctx.lineTo(to.x, to.y);
  ctx.lineTo(to.x - dir.x * k - side.x * k, to.y - dir.y * k - side.y * k);
  ctx.stroke();
}

export function drawRoofLabels(ctx: Ctx, s: Session, model: Model) {
  for (const id of s.selection.roofs) {
    const roof = findRoof(model, id);
    if (!roof || roof.storeyId !== s.storeyId) continue;
    const g = roofGeometry(model, roof);
    const v = s.viewport;
    ctx.save();
    ctx.setLineDash([6, 4]);
    ctx.strokeStyle = AUX;
    ctx.lineWidth = 1;
    ctx.beginPath();
    roof.outline.forEach((p, i) =>
      i ? ctx.lineTo(v.toScreen(p).x, v.toScreen(p).y) : ctx.moveTo(v.toScreen(p).x, v.toScreen(p).y),
    );
    ctx.closePath();
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.font = `600 ${uiPx(12)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    g.edges.forEach((e, i) => {
      const m = { x: (e.a.x + e.b.x) / 2, y: (e.a.y + e.b.y) / 2 };
      const eave = v.toScreen({ x: m.x - e.n.x * e.overhang, y: m.y - e.n.y * e.overhang });
      const c = v.toScreen(m);
      // Směr dovnitř na obrazovce (osa y obrazovky jde dolů – vezme se z převodu bodů).
      const p2 = v.toScreen({ x: m.x + e.n.x * 1000, y: m.y + e.n.y * 1000 });
      const dir = {
        x: (p2.x - c.x) / Math.hypot(p2.x - c.x, p2.y - c.y),
        y: (p2.y - c.y) / Math.hypot(p2.x - c.x, p2.y - c.y),
      };
      const at = { x: eave.x - dir.x * uiPx(16), y: eave.y - dir.y * uiPx(16) };
      tag(ctx, at, `${i + 1} · ${e.gable ? 'štít' : deg(e.slope)}`);
      if (!e.gable) arrow(ctx, { x: c.x + dir.x * uiPx(6), y: c.y + dir.y * uiPx(6) }, dir);
    });
    ctx.restore();
  }
}
