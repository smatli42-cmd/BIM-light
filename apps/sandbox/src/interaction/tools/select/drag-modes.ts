// Výběr rámečkem a přesun výběru tažením myší (pravidla-interakce: Výběr; základ 25).
import { add, allWallGeometry, boxSelect, rectOf, roundTo, sub, type Id, type Vec2 } from '@bim-light/core';
import type { Session } from '../../../session/session.ts';
import { DRAG_PX, type Mode } from '../../mode.ts';
import type { Overlay, PointerInfo } from '../../types.ts';

const far = (a: Vec2, b: Vec2) => Math.hypot(a.x - b.x, a.y - b.y) > DRAG_PX;

/** Rámeček: zleva doprava jen celé prvky, zprava doleva i protnuté; Shift přidá. */
export class BoxMode implements Mode {
  active = true;
  private b: Vec2;
  private moved = false;

  constructor(
    private readonly s: Session,
    private readonly a: Vec2,
    private readonly add: boolean,
  ) {
    this.b = a;
  }

  move(p: PointerInfo) {
    this.b = p.screen;
    if (far(this.a, this.b)) this.moved = true;
  }

  up() {
    this.active = false;
    const s = this.s;
    if (!this.moved) {
      if (!this.add) s.selection.clear();
      return;
    }
    const v = s.viewport;
    const r = rectOf(v.toWorld(this.a), v.toWorld(this.b));
    const got = boxSelect(s.model, s.view, r, this.b.x < this.a.x, s.filter);
    if (this.add)
      s.selection.set(
        [...s.selection.walls, ...got.wallIds],
        [...s.selection.dims, ...got.dimensionIds],
        [...s.selection.openings, ...got.openingIds],
        [...s.selection.slabs, ...got.slabIds],
        [...s.selection.slabOpenings, ...got.slabOpeningIds],
      );
    else s.selection.set(got.wallIds, got.dimensionIds, got.openingIds, got.slabIds, got.slabOpeningIds);
  }

  down() {
    return false;
  }

  escape() {
    this.active = false;
  }

  overlay(): Overlay {
    return this.moved ? { box: { a: this.a, b: this.b, crossing: this.b.x < this.a.x } } : {};
  }
}

/** Stisk na stěně: klik vybere, tažení přesune celý výběr (navazující stěny se natáhnou). */
export class PressWallMode implements Mode {
  active = true;
  private dragging = false;
  private vector: Vec2 = { x: 0, y: 0 };

  constructor(
    private readonly s: Session,
    private readonly wallId: Id,
    private readonly start: PointerInfo,
  ) {}

  move(p: PointerInfo) {
    if (!this.dragging && far(p.screen, this.start.screen)) this.dragging = true;
    if (!this.dragging) return;
    const v = sub(p.world, this.start.world);
    this.vector = p.alt ? v : { x: roundTo(v.x), y: roundTo(v.y) };
  }

  up(p: PointerInfo) {
    this.active = false;
    const s = this.s;
    if (!this.dragging) {
      if (!p.shift) s.selection.set([this.wallId]);
      return;
    }
    if (Math.hypot(this.vector.x, this.vector.y) > 0.5)
      s.run('wall.move', { wallIds: s.selection.walls, vector: this.vector });
  }

  down() {
    return false;
  }

  escape() {
    this.active = false;
  }

  overlay(): Overlay {
    if (!this.dragging) return {};
    const geoms = allWallGeometry(this.s.model, this.s.storeyId);
    const ghosts = this.s.selection.walls
      .map((id) => (geoms.get(id)?.outlines ?? []).map((loop) => loop.map((q) => add(q, this.vector))))
      .flat();
    return { ghosts, lines: [[this.start.world, add(this.start.world, this.vector)]] };
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
