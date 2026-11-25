// Stisk na otvoru (plán stěn Z4; základ 25): klik vybere, tažení posune vybrané otvory – po stěně
// i na jinou stěnu pod kurzorem; přichytává se jako nástroj Otvor (Alt vypne). Stěna stojí.
import {
  centerOf,
  hostAt,
  snapOpening,
  stationAt,
  sub,
  type Id,
  type Model,
  type Vec2,
} from '@bim-light/core';
import type { Session } from '../../../session/session.ts';
import { SNAP_PX } from '../../../session/session.ts';
import { DRAG_PX, type Mode } from '../../mode.ts';
import type { Overlay, PointerInfo } from '../../types.ts';

export class PressOpeningMode implements Mode {
  active = true;
  private dragging = false;
  private vector: Vec2 = { x: 0, y: 0 };
  private label: string | null = null;

  constructor(
    private readonly s: Session,
    private readonly openingId: Id,
    private readonly start: PointerInfo,
  ) {}

  /** Posun středu otvoru na bod `p` s přichycením na stěně pod ním. */
  private vectorTo(p: PointerInfo): Vec2 {
    const s = this.s;
    const o = s.model.openings[this.openingId];
    if (!o) return { x: 0, y: 0 };
    const from = centerOf(s.model, o);
    const target = { x: from.x + p.world.x - this.start.world.x, y: from.y + p.world.y - this.start.world.y };
    const hit = hostAt(s.model, o.storeyId, target, o.hostId, s.viewport.px(6));
    if (!hit) return sub(target, from);
    const snap = p.alt
      ? { offset: hit.s - o.width / 2, label: null }
      : snapOpening(s.model, hit.wall.id, hit.s, o.width, s.viewport.px(SNAP_PX), o.id);
    this.label = snap.label;
    return sub(stationAt(hit.wall.path, snap.offset + o.width / 2).point, from);
  }

  move(p: PointerInfo) {
    const far = Math.hypot(p.screen.x - this.start.screen.x, p.screen.y - this.start.screen.y) > DRAG_PX;
    if (!this.dragging && far) this.dragging = true;
    if (this.dragging) this.vector = this.vectorTo(p);
  }

  private params() {
    return { openingIds: this.s.selection.openings, vector: this.vector };
  }

  up(p: PointerInfo) {
    this.active = false;
    const s = this.s;
    if (!this.dragging) {
      if (!p.shift) s.selection.set([], [], [this.openingId]);
      return;
    }
    if (Math.hypot(this.vector.x, this.vector.y) > 0.5) s.run('opening.move', this.params());
  }

  down() {
    return false;
  }

  escape() {
    this.active = false;
  }

  overlay(): Overlay {
    if (!this.dragging) return {};
    const m: Model | null = this.s.editor.preview('opening.move', this.params());
    const o = m?.openings[this.openingId];
    const snap = m && o && this.label ? { point: centerOf(m, o), label: this.label } : null;
    return { previewModel: m, snap };
  }

  tracker() {
    return this.dragging
      ? [
          {
            label: 'Posun',
            value: String(Math.round(Math.hypot(this.vector.x, this.vector.y))),
            active: true,
          },
        ]
      : null;
  }
}
