// Tažení kót (pravidla-interakce, kóty 3, 4, 6; katalog kreslení 3, 4): kótovací čára se odsouvá,
// zarovnaná skupina jde spolu (Alt = jen tato kóta), klik bez tažení kótu vybere a na čísle otevře pole.
import { dot, roundTo, sub, type Dimension, type Id } from '@bim-light/core';
import type { Session } from '../../../session/session.ts';
import type { PermDimView } from '../../hits.ts';
import { DRAG_PX, type Mode } from '../../mode.ts';
import { placeDrafts, type Placed } from '../../placing.ts';
import type { TempDimView } from '../../temp-layout.ts';
import type { Overlay, PointerInfo } from '../../types.ts';
import { editPerm, editTemp } from '../../value-edit.ts';

const moved = (a: PointerInfo, b: PointerInfo) =>
  Math.hypot(a.screen.x - b.screen.x, a.screen.y - b.screen.y) > DRAG_PX;

/** Kóty, které se táhnou spolu: celá skupina zarovnání, s Altem jen jedna. */
export function dragSet(s: Session, d: Dimension, alt: boolean): Dimension[] {
  if (alt || !d.alignGroupId) return [d];
  return Object.values(s.model.dimensions).filter((x) => x.alignGroupId === d.alignGroupId);
}

export class PermDimDragMode implements Mode {
  active = true;
  private dragging = false;
  private placed: Placed | null = null;
  private alt = false;

  constructor(
    private readonly s: Session,
    private readonly view: PermDimView,
    private readonly onText: boolean,
    private readonly start: PointerInfo,
  ) {}

  move(p: PointerInfo) {
    if (!this.dragging && moved(p, this.start)) this.dragging = true;
    if (!this.dragging) return;
    this.alt = p.alt;
    this.placed = placeDrafts(this.s, dragSet(this.s, this.view.dim, p.alt), p.world, p.alt);
  }

  up(p: PointerInfo) {
    this.active = false;
    const s = this.s;
    if (this.dragging && this.placed) {
      const grouped = this.view.dim.alignGroupId !== null;
      s.run('dimension.place', {
        dimensionIds: this.placed.drafts.map((d) => d.id),
        point: this.placed.point,
        ...(this.placed.alignWith ? { alignWith: this.placed.alignWith } : {}),
        ...(this.alt && grouped ? { detach: true } : {}),
      });
      return;
    }
    if (this.onText && !p.shift)
      return editPerm(s, this.view, [...s.selection.walls, ...s.selection.openings]);
    if (p.shift) s.selection.toggleDim(this.view.id);
    else s.selection.set([], [this.view.id]);
  }

  down() {
    return false;
  }

  escape() {
    this.active = false;
  }

  overlay(): Overlay {
    if (!this.placed) return {};
    const hidden: Id[] = this.placed.drafts.map((d) => d.id);
    return {
      draftDims: this.placed.drafts,
      hiddenDims: hidden,
      guides: this.placed.guide ? [this.placed.guide] : [],
    };
  }
}

/** Dočasná kóta: tažení posune čáru (jen v rozhraní), klik na číslo otevře pole. */
export class TempDimDragMode implements Mode {
  active = true;
  private dragging = false;

  constructor(
    private readonly s: Session,
    private readonly view: TempDimView,
    private readonly onText: boolean,
    private readonly start: PointerInfo,
  ) {}

  move(p: PointerInfo) {
    if (!this.dragging && moved(p, this.start)) this.dragging = true;
    if (!this.dragging) return;
    this.s.tempOffsets[this.view.key] = roundTo(dot(sub(p.world, this.view.base), this.view.shiftDir));
  }

  up() {
    this.active = false;
    if (!this.dragging && this.onText) editTemp(this.s, this.view);
  }

  down() {
    return false;
  }

  escape() {
    this.active = false;
  }

  overlay(): Overlay {
    return {};
  }
}
