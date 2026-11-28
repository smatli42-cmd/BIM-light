// Nástroj Popis skladby v okně řezu (česká výkresová praxe; Revit Multi-layer tag, Archicad Composite label):
// první klik na řezanou stěnu nebo desku = bod uchycení, další kliky = body odkazové čáry – první vždy kolmo
// ke konstrukci, další se srovnají vodorovně / svisle (Shift = volně). Dvojklik, Enter nebo pravé tlačítko
// popis vloží (poslední bod = kolečko s číslem), Esc vrátí bod. Popis pod kurzorem jde vybrat (Shift přidá)
// a táhnout kolečko s řádky (čára zůstane v pravých úhlech). Model se mění jen příkazy compositionTag.*.
import {
  cutRowOf,
  leaderAxis,
  moveLeaderEnd,
  nextLeaderPoint,
  sectionPickAt,
  tagLayout,
  tagTextBox,
  type Id,
  type Primitive,
  type Vec2,
} from '@bim-light/core';
import type { Viewport } from '../../canvas/viewport.ts';
import { AUX } from '../../render/overlay.ts';
import { drawPrimitive, type RenderContext } from '../../render/primitives.ts';
import { tagDefaults } from '../../session/tag-defaults.ts';
import type { Session } from '../../session/session.ts';

const PICK_PX = 3;
const DOUBLE_MS = 400;

const segDist = (p: Vec2, a: Vec2, b: Vec2) => {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const l2 = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2));
  return Math.hypot(p.x - a.x - dx * t, p.y - a.y - dy * t);
};

interface Drawing {
  readonly elementId: Id;
  readonly at: Vec2;
  /** Body čáry vůči bodu uchycení. */
  readonly pts: Vec2[];
  last: { time: number; screen: Vec2 } | null;
}

interface Drag {
  readonly id: Id;
  readonly start: Vec2;
  moved: boolean;
}

export class SectionTagInput {
  private draw: Drawing | null = null;
  private mouse: Vec2 | null = null;
  private shift = false;
  private drag: Drag | null = null;

  constructor(
    private readonly s: Session,
    private readonly sectionId: Id,
    private readonly v: Viewport,
  ) {}

  get active(): boolean {
    return this.s.tool.id === 'compositionTag';
  }

  get dragging(): boolean {
    return !!this.drag;
  }

  /** Řezaná stěna nebo deska pod kurzorem (nejbližší). */
  private elementAt(p: Vec2): Id | null {
    const sec = this.s.model.sections[this.sectionId];
    if (!sec) return null;
    const ids = sectionPickAt(this.s.model, sec, p, this.v.px(PICK_PX));
    return ids.find((id) => cutRowOf(this.s.model, sec, id)) ?? null;
  }

  /** Další bod čáry pod kurzorem (vůči bodu uchycení, srovnaný podle pravidla jádra). */
  private next(d: Drawing, p: Vec2, free: boolean): Vec2 {
    const rel = { x: p.x - d.at.x, y: p.y - d.at.y };
    return nextLeaderPoint(leaderAxis(this.s.model, d.elementId), d.pts, rel, free);
  }

  click(p: Vec2, shift = false) {
    const d = this.draw;
    if (!d) {
      const id = this.elementAt(p);
      if (!id) return this.s.toast('Klikni na řezanou stěnu nebo desku (ne na prvek v pohledu).', 'bad');
      this.draw = { elementId: id, at: p, pts: [], last: null };
      return;
    }
    const screen = this.v.toScreen(p);
    const now = performance.now();
    const twice =
      d.last &&
      now - d.last.time < DOUBLE_MS &&
      Math.hypot(screen.x - d.last.screen.x, screen.y - d.last.screen.y) < 6;
    if (twice && d.pts.length) return void this.finish();
    d.pts.push(this.next(d, p, shift));
    d.last = { time: now, screen };
  }

  /** Dvojklik / Enter / pravé tlačítko: vloží popis; true = bylo co vložit. */
  finish(): boolean {
    const d = this.draw;
    if (!d) return false;
    if (!d.pts.length) return true;
    const r = this.s.run('compositionTag.create', {
      sectionId: this.sectionId,
      elementId: d.elementId,
      at: d.at,
      points: d.pts.map((q) => ({ x: d.at.x + q.x, y: d.at.y + q.y })),
      ...tagDefaults(this.s),
    });
    if (r.ok) this.draw = null;
    return true;
  }

  /** Esc: ubere poslední bod, pak zruší rozkreslený popis. */
  escape(): boolean {
    const d = this.draw;
    if (!d) return false;
    if (d.pts.length) d.pts.pop();
    else this.draw = null;
    return true;
  }

  /** Popis pod kurzorem: kolečko s řádky (obdélník) nebo odkazová čára. */
  hit(p: Vec2): { id: Id } | null {
    const m = this.s.model;
    const sec = m.sections[this.sectionId];
    if (!sec) return null;
    const tol = this.v.px(4);
    for (const t of Object.values(m.compositionTags)) {
      if (t.sectionId !== sec.id) continue;
      const l = tagLayout(m, sec, t);
      if (!l) continue;
      const b = tagTextBox(l, t.side, m.display.paperSizes, sec.scale);
      const inBox = p.x >= b.x0 - tol && p.x <= b.x1 + tol && p.y >= b.y0 - tol && p.y <= b.y1 + tol;
      const onLine = l.path.some((a, i) => i > 0 && segDist(p, l.path[i - 1] as Vec2, a) <= tol);
      if (inBox || onLine) return { id: t.id };
    }
    return null;
  }

  /** Stisk mimo nástroj: na popisu ho vybere a začne tažení kolečka; false = popis tu není. */
  press(p: Vec2, shift: boolean): boolean {
    const h = this.hit(p);
    if (!h) return false;
    if (shift) this.s.selection.toggleLevelDim(h.id);
    else if (!this.s.selection.levelDims.includes(h.id))
      this.s.selection.set([], [], [], [], [], [], [], [h.id]);
    this.drag = { id: h.id, start: p, moved: false };
    this.s.changed();
    return true;
  }

  move(p: Vec2, shift = false) {
    this.mouse = p;
    this.shift = shift;
    if (this.drag)
      this.drag.moved ||= Math.hypot(p.x - this.drag.start.x, p.y - this.drag.start.y) > this.v.px(3);
  }

  release() {
    const d = this.drag;
    this.drag = null;
    const m = this.mouse;
    if (!d?.moved || !m) return;
    this.s.run('compositionTag.move', { tagId: d.id, delta: { x: m.x - d.start.x, y: m.y - d.start.y } });
  }

  /** Náhled: rozkreslená čára k myši, nebo tažená čára (stejné pravidlo jako příkaz). */
  private ghost(m: Vec2): Vec2[] {
    const d = this.draw;
    if (d)
      return [
        d.at,
        ...[...d.pts, this.next(d, m, this.shift)].map((q) => ({ x: d.at.x + q.x, y: d.at.y + q.y })),
      ];
    const g = this.drag;
    const sec = this.s.model.sections[this.sectionId];
    const t = g?.moved ? this.s.model.compositionTags[g.id] : undefined;
    const l = t && sec ? tagLayout(this.s.model, sec, t) : null;
    if (!g || !t || !l) return [];
    const delta = { x: m.x - g.start.x, y: m.y - g.start.y };
    const pts = moveLeaderEnd(leaderAxis(this.s.model, t.elementId), t.leader, delta) ?? t.leader;
    return [l.anchor, ...pts.map((q) => ({ x: l.anchor.x + q.x, y: l.anchor.y + q.y }))];
  }

  overlay(r: RenderContext) {
    const m = this.mouse;
    if (!m) return;
    const points = this.ghost(m);
    if (points.length < 2) return;
    const line: Primitive = {
      kind: 'line',
      points,
      closed: false,
      stroke: { pen: 1, color: AUX, lineType: 'dashed' },
      source: { role: 'náhled' },
    };
    drawPrimitive(r, line, AUX);
  }
}
