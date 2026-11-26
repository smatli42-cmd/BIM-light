// Posun čísla vybrané kóty tažením (pokyn uživatele 2026-11-27; Revit: tažení textu vybrané kóty):
// číslo klouže po kótovací čáře, i ven za odkazové čáry (kótovací čára se pod ně prodlouží). Klik bez
// tažení otevře pole pro číslo jako dosud. Nevybraná kóta se tažením čísla dál posouvá celá.
import { layoutDimension, textShiftAt, type Dimension } from '@bim-light/core';
import type { Session } from '../../../session/session.ts';
import type { PermDimView } from '../../hits.ts';
import { DRAG_PX, type Mode } from '../../mode.ts';
import type { Overlay, PointerInfo } from '../../types.ts';
import { editPerm } from '../../value-edit.ts';

export class DimTextMode implements Mode {
  active = true;
  private dragging = false;
  private shift: number | null = null;

  constructor(
    private readonly s: Session,
    private readonly view: PermDimView,
    private readonly start: PointerInfo,
  ) {}

  private shiftAt(p: PointerInfo): number | null {
    const d = this.view.dim;
    const lay = layoutDimension(this.s.model, d, this.s.view.scale, this.s.model.display.paperSizes);
    return lay ? Math.round(textShiftAt(lay, d, p.world)) : null;
  }

  move(p: PointerInfo) {
    const far = Math.hypot(p.screen.x - this.start.screen.x, p.screen.y - this.start.screen.y) > DRAG_PX;
    if (!this.dragging && far) this.dragging = true;
    if (this.dragging) this.shift = this.shiftAt(p);
  }

  up() {
    this.active = false;
    if (this.dragging && this.shift !== null)
      this.s.run('dimension.setTextShift', { dimensionIds: [this.view.id], shift: this.shift });
    else editPerm(this.s, this.view, [...this.s.selection.walls, ...this.s.selection.openings]);
  }

  down() {
    return false;
  }

  escape() {
    this.active = false;
  }

  overlay(): Overlay {
    if (this.shift === null) return {};
    const draft: Dimension = { ...this.view.dim, textShift: this.shift };
    return { draftDims: [draft], hiddenDims: [this.view.id] };
  }
}
