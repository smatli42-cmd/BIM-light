// Čísla hran a sklony vybrané střechy v půdorysu (hlášení uživatele 2026-11-28): u každé hrany obrysu
// štítek „1 · 45°“ / „2 · štít“ za okapem (číslo jako v info boxu) se šipkou ve směru stoupání roviny
// a referenční čára čárkovaně. Jen pomůcka rozhraní, data i výpočet z jádra (roofGeometry).
import { findRoof, roofGeometry, type Model, type Vec2 } from '@bim-light/core';
import { uiPx } from '../session/ui-scale.ts';
import type { Session } from '../session/session.ts';
import { roofDefaults } from '../session/roof-defaults.ts';
import { AUX, SELECT, type Ctx } from './overlay.ts';

const deg = (v: number) => `${Number.isInteger(v) ? v : v.toFixed(1).replace('.', ',')}°`;

function tag(ctx: Ctx, at: Vec2, text: string, on = false) {
  const h = uiPx(18);
  const w = ctx.measureText(text).width + uiPx(10);
  ctx.fillStyle = on ? SELECT : '#ffffff';
  ctx.strokeStyle = SELECT;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(at.x - w / 2, at.y - h / 2, w, h, uiPx(4));
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = on ? '#ffffff' : SELECT;
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

/** Štítek hrany střechy v px plátna: střed štítku, střed hrany ref. čáry a směr dovnitř. */
export interface RoofEdgeTag {
  readonly roofId: string;
  readonly index: number;
  readonly text: string;
  readonly slope: boolean;
  readonly at: Vec2;
  readonly mid: Vec2;
  readonly dir: Vec2;
  /** Hrana ref. čáry a okapová čára v px (klik na hranu ji vybere). */
  readonly ref: readonly [Vec2, Vec2];
  readonly eave: readonly [Vec2, Vec2];
}

/** Štítky hran vybraných střech podlaží (stejné pro kresbu i klik). */
export function roofEdgeTags(s: Session, model: Model): RoofEdgeTag[] {
  const v = s.viewport;
  return s.selection.roofs.flatMap((id) => {
    const roof = findRoof(model, id);
    if (!roof || roof.storeyId !== s.storeyId) return [];
    return roofGeometry(model, roof).edges.map((e, i) => {
      const off = (q: Vec2) => v.toScreen({ x: q.x - e.n.x * e.overhang, y: q.y - e.n.y * e.overhang });
      const m = { x: (e.a.x + e.b.x) / 2, y: (e.a.y + e.b.y) / 2 };
      const eave = off(m);
      const c = v.toScreen(m);
      // Směr dovnitř na obrazovce (osa y obrazovky jde dolů – vezme se z převodu bodů).
      const p2 = v.toScreen({ x: m.x + e.n.x * 1000, y: m.y + e.n.y * 1000 });
      const l = Math.hypot(p2.x - c.x, p2.y - c.y) || 1;
      const dir = { x: (p2.x - c.x) / l, y: (p2.y - c.y) / l };
      return {
        roofId: id,
        index: i,
        text: `${i + 1} · ${e.halfhip ? `polovalba ${deg(e.slope)}` : e.gable ? 'štít' : deg(e.slope)}`,
        slope: !e.gable || e.halfhip,
        at: { x: eave.x - dir.x * uiPx(16), y: eave.y - dir.y * uiPx(16) },
        mid: c,
        dir,
        ref: [v.toScreen(e.a), v.toScreen(e.b)] as const,
        eave: [off(e.a), off(e.b)] as const,
      };
    });
  });
}

export function drawRoofLabels(ctx: Ctx, s: Session, model: Model) {
  const active = roofDefaults(s).edge;
  for (const id of s.selection.roofs) {
    const roof = findRoof(model, id);
    if (!roof || roof.storeyId !== s.storeyId) continue;
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
    ctx.restore();
  }
  ctx.save();
  ctx.font = `600 ${uiPx(12)}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const t of roofEdgeTags(s, model)) {
    const on = active?.roofId === t.roofId && active.index === t.index;
    if (on) {
      // Vybraná hrana: zvýrazněná okapová čára.
      ctx.strokeStyle = SELECT;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(t.eave[0].x, t.eave[0].y);
      ctx.lineTo(t.eave[1].x, t.eave[1].y);
      ctx.stroke();
    }
    tag(ctx, t.at, t.text, on);
    if (t.slope) arrow(ctx, { x: t.mid.x + t.dir.x * uiPx(6), y: t.mid.y + t.dir.y * uiPx(6) }, t.dir);
  }
  ctx.restore();
}
