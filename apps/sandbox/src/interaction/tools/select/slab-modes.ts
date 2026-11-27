// Výběr a úpravy desky nástrojem Výběr (D2; základ 25 – pohne se jen vybraná deska, stěny stojí):
// klik vybere, tažení posune vybrané desky, uzel obrysu se táhne nebo klikne na nové místo.
import { add, findSlab, roundTo, slabsAt, sub, type Id, type Model, type Vec2 } from '@bim-light/core';
import type { Session } from '../../../session/session.ts';
import { DRAG_PX, type Mode } from '../../mode.ts';
import { deltaFields, trackerMm } from '../../tracker-fields.ts';
import type { Overlay, PointerInfo, TrackerField } from '../../types.ts';
import { ClickOrDrag } from './click-or-drag.ts';

/** Deska pod kurzorem (desky leží pod stěnami – zkouší se až po nich); izolované popisy = žádná. */
export function slabUnder(s: Session, p: PointerInfo): Id | null {
  if (s.screen.isolate || !s.filter.slabs) return null;
  return slabsAt(s.model, s.view, p.world, s.viewport.px(2))[0] ?? null;
}

const moveTracker = (v: Vec2): TrackerField[] => [
  { label: 'Posun', value: trackerMm(Math.hypot(v.x, v.y)), active: true },
  ...deltaFields({ x: 0, y: 0 }, v),
];

/** Stisk na desce: klik vybere, tažení posune všechny vybrané desky. */
export class PressSlabMode implements Mode {
  active = true;
  private dragging = false;
  private vector: Vec2 = { x: 0, y: 0 };

  constructor(
    private readonly s: Session,
    private readonly slabId: Id,
    private readonly start: PointerInfo,
  ) {}

  move(p: PointerInfo) {
    const far = Math.hypot(p.screen.x - this.start.screen.x, p.screen.y - this.start.screen.y) > DRAG_PX;
    if (!this.dragging && far) this.dragging = true;
    if (!this.dragging) return;
    const v = sub(p.world, this.start.world);
    this.vector = p.alt ? v : { x: roundTo(v.x), y: roundTo(v.y) };
  }

  private params() {
    return { slabIds: this.s.selection.slabs, vector: this.vector };
  }

  up(p: PointerInfo) {
    this.active = false;
    if (!this.dragging) {
      if (!p.shift) this.s.selection.set([], [], [], [this.slabId]);
      return;
    }
    if (Math.hypot(this.vector.x, this.vector.y) > 0.5) this.s.run('slab.move', this.params());
  }

  down() {
    return false;
  }

  escape() {
    this.active = false;
  }

  overlay(): Overlay {
    if (!this.dragging) return {};
    return {
      previewModel: this.s.editor.preview('slab.move', this.params()),
      lines: [[this.start.world, add(this.start.world, this.vector)]],
    };
  }

  tracker() {
    return this.dragging ? moveTracker(this.vector) : null;
  }
}

/** Posun bodu obrysu vybrané desky: přichytává se (Alt vypne), od sousedního bodu platí úhlové kroky. */
export class SlabVertexMode extends ClickOrDrag {
  readonly hint = 'Klikni nebo pusť bod obrysu na nové místo (přichytává se; Alt vypne).';
  private point: Vec2;
  private readonly origin: Vec2;
  private preview: Model | null = null;

  constructor(
    s: Session,
    private readonly slabId: Id,
    private readonly index: number,
    start: PointerInfo,
    drag: boolean,
  ) {
    super(s, start, drag);
    this.point = findSlab(s.model, slabId)?.outline[index] ?? start.world;
    this.origin = this.point;
  }

  private params() {
    return { slabId: this.slabId, index: this.index, point: this.point };
  }

  protected update(p: PointerInfo) {
    this.last = p;
    const o = findSlab(this.s.model, this.slabId)?.outline ?? [];
    const from = o[(this.index - 1 + o.length) % o.length] ?? null;
    this.point = this.s.snap(p.world, { alt: p.alt, orthoOnly: p.shift, from }).point;
    this.preview =
      this.moved || !this.dragging ? this.s.editor.preview('slab.moveVertex', this.params()) : null;
  }

  protected finish() {
    this.done();
    this.preview = null;
    this.s.run('slab.moveVertex', this.params());
  }

  tracker(): TrackerField[] {
    const d = Math.hypot(this.point.x - this.origin.x, this.point.y - this.origin.y);
    return [
      { label: 'Vzdálenost', value: trackerMm(d), active: false },
      ...deltaFields(this.origin, this.point),
    ];
  }

  overlay(): Overlay {
    return { previewModel: this.preview, markers: [this.point] };
  }
}
