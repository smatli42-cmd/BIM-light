// Nástroj Popis skladby v okně řezu (Revit Multi-layer tag, Archicad Composite label): první klik na řezanou
// stěnu nebo desku = bod uchycení (tečka), druhý klik = poloha textu (polička). Popis pod kurzorem jde vybrat
// (Shift přidá) a táhnout jeho text; Esc vrátí krok. Model se mění jen příkazy compositionTag.* (jako AI).
import {
  cutRowOf,
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

const segDist = (p: Vec2, a: Vec2, b: Vec2) => {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const l2 = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2));
  return Math.hypot(p.x - a.x - dx * t, p.y - a.y - dy * t);
};

interface Drag {
  readonly id: Id;
  readonly start: Vec2;
  readonly textAt0: Vec2;
  readonly anchor: Vec2;
  moved: boolean;
}

export class SectionTagInput {
  private anchor: { elementId: Id; at: Vec2 } | null = null;
  private mouse: Vec2 | null = null;
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

  click(p: Vec2) {
    if (!this.anchor) {
      const id = this.elementAt(p);
      if (!id) return this.s.toast('Klikni na řezanou stěnu nebo desku (ne na prvek v pohledu).', 'bad');
      this.anchor = { elementId: id, at: p };
      return;
    }
    const r = this.s.run('compositionTag.create', {
      sectionId: this.sectionId,
      elementId: this.anchor.elementId,
      at: this.anchor.at,
      textAt: p,
      ...tagDefaults(this.s),
    });
    if (r.ok) this.anchor = null;
  }

  escape(): boolean {
    if (!this.anchor) return false;
    this.anchor = null;
    return true;
  }

  /** Popis pod kurzorem: text (obdélník) nebo odkazová čára. */
  hit(p: Vec2): { id: Id; textAt: Vec2; anchor: Vec2 } | null {
    const m = this.s.model;
    const sec = m.sections[this.sectionId];
    if (!sec) return null;
    const tol = this.v.px(4);
    for (const t of Object.values(m.compositionTags)) {
      if (t.sectionId !== sec.id) continue;
      const l = tagLayout(m, sec, t);
      if (!l) continue;
      const b = tagTextBox(l, m.display.paperSizes, sec.scale);
      const inBox = p.x >= b.x0 - tol && p.x <= b.x1 + tol && p.y >= b.y0 - tol && p.y <= b.y1 + tol;
      if (inBox || segDist(p, l.anchor, l.textAt) <= tol)
        return { id: t.id, textAt: l.textAt, anchor: l.anchor };
    }
    return null;
  }

  /** Stisk mimo nástroj: na popisu ho vybere a začne tažení textu; false = popis tu není. */
  press(p: Vec2, shift: boolean): boolean {
    const h = this.hit(p);
    if (!h) return false;
    if (shift) this.s.selection.toggleLevelDim(h.id);
    else if (!this.s.selection.levelDims.includes(h.id))
      this.s.selection.set([], [], [], [], [], [], [], [h.id]);
    this.drag = { id: h.id, start: p, textAt0: h.textAt, anchor: h.anchor, moved: false };
    this.s.changed();
    return true;
  }

  move(p: Vec2) {
    this.mouse = p;
    if (this.drag)
      this.drag.moved ||= Math.hypot(p.x - this.drag.start.x, p.y - this.drag.start.y) > this.v.px(3);
  }

  release() {
    const d = this.drag;
    this.drag = null;
    const m = this.mouse;
    if (!d?.moved || !m) return;
    const textAt = { x: d.textAt0.x + m.x - d.start.x, y: d.textAt0.y + m.y - d.start.y };
    this.s.run('compositionTag.move', { tagId: d.id, textAt });
  }

  overlay(r: RenderContext) {
    const m = this.mouse;
    if (!m) return;
    const line = (a: Vec2, b: Vec2): Primitive => ({
      kind: 'line',
      points: [a, b],
      closed: false,
      stroke: { pen: 1, color: AUX, lineType: 'dashed' },
      source: { role: 'náhled' },
    });
    const d = this.drag;
    const prims: Primitive[] = [];
    if (this.anchor) prims.push(line(this.anchor.at, m));
    if (d?.moved)
      prims.push(line(d.anchor, { x: d.textAt0.x + m.x - d.start.x, y: d.textAt0.y + m.y - d.start.y }));
    for (const p of prims) drawPrimitive(r, p, AUX);
  }
}
