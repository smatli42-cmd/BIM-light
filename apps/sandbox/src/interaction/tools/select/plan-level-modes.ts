// Výběr výškové kóty v půdorysu nástrojem Výběr: klik na hodnotu (rámeček) nebo kroužek vybere (Shift přidá),
// tažení ji posune (u kroužku tažení hodnoty posune jen hodnotu, kroužek zůstane), Del smaže.
// Mění se jen příkazem planLevelDim.move (stejně jako AI).
import { layerState, levelMarkSize, roundTo, sub, type Id, type Vec2 } from '@bim-light/core';
import type { Session } from '../../../session/session.ts';
import { DRAG_PX, type Mode } from '../../mode.ts';
import type { Overlay, PointerInfo } from '../../types.ts';

/** Výšková kóta pod kurzorem a jestli byl zásah do hodnoty (ne do kroužku). */
function planLevelUnder(s: Session, p: PointerInfo): { id: Id; text: boolean } | null {
  const sizes = s.model.display.paperSizes;
  const k = s.view.scale;
  const th = sizes.labelText * k;
  for (const d of Object.values(s.model.planLevelDims)) {
    if (d.storeyId !== s.view.storeyId || !layerState(s.model.display, s.view, d.annotationLayerId).visible)
      continue;
    const w = th * 4 + s.viewport.px(3);
    const box = d.marker === 'box' ? th : th * 2;
    const dx =
      d.marker === 'box'
        ? p.world.x - d.textAt.x
        : (p.world.x - d.textAt.x) * Math.sign(d.textAt.x - d.point.x || 1) - w;
    if (Math.abs(dx) <= w && Math.abs(p.world.y - d.textAt.y) <= box) return { id: d.id, text: true };
    const r = (levelMarkSize(sizes) / 2) * k + s.viewport.px(3);
    if (d.marker === 'circle' && Math.hypot(p.world.x - d.point.x, p.world.y - d.point.y) <= r)
      return { id: d.id, text: false };
  }
  return null;
}

class PlanLevelDragMode implements Mode {
  active = true;
  private dragging = false;
  private vector: Vec2 = { x: 0, y: 0 };
  readonly hint = 'Táhni výškovou kótu; Del smaže.';

  constructor(
    private readonly s: Session,
    private readonly id: Id,
    private readonly start: PointerInfo,
    private readonly textOnly: boolean,
  ) {}

  private params() {
    return { levelDimId: this.id, delta: this.vector, textOnly: this.textOnly };
  }

  move(p: PointerInfo) {
    if (Math.hypot(p.screen.x - this.start.screen.x, p.screen.y - this.start.screen.y) > DRAG_PX)
      this.dragging = true;
    if (!this.dragging) return;
    const v = sub(p.world, this.start.world);
    this.vector = p.alt ? v : { x: roundTo(v.x), y: roundTo(v.y) };
  }

  up() {
    this.active = false;
    if (this.dragging && Math.hypot(this.vector.x, this.vector.y) > 0.5)
      this.s.run('planLevelDim.move', this.params());
  }

  down() {
    return false;
  }

  escape() {
    this.active = false;
  }

  overlay(): Overlay {
    return this.dragging ? { previewModel: this.s.editor.preview('planLevelDim.move', this.params()) } : {};
  }
}

const DONE: Mode = { active: false, move() {}, up() {}, down: () => false, escape() {}, overlay: () => ({}) };

/** Stisk na výškové kótě v půdorysu; null = žádná pod kurzorem. */
export function pressPlanLevel(s: Session, p: PointerInfo): Mode | null {
  if (s.screen.isolate) return null;
  const hit = planLevelUnder(s, p);
  if (!hit) return null;
  if (p.shift) {
    s.selection.toggleLevelDim(hit.id);
    return DONE;
  }
  if (!s.selection.levelDims.includes(hit.id)) s.selection.set([], [], [], [], [], [], [], [hit.id]);
  const d = s.model.planLevelDims[hit.id];
  return new PlanLevelDragMode(s, hit.id, p, hit.text && d?.marker === 'circle');
}
