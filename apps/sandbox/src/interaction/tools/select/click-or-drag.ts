// Společný základ režimů úprav stěny: klik i tažení, Enter potvrdí, číslo jde psát (katalog kreslení 5).
import { parseNumber, type Vec2 } from '@bim-light/core';
import type { Session } from '../../../session/session.ts';
import { clearTyped, editTyped } from '../../../session/ui-state.ts';
import { DRAG_PX, type Mode } from '../../mode.ts';
import type { KeyInfo, Overlay, PointerInfo } from '../../types.ts';

export abstract class ClickOrDrag implements Mode {
  active = true;
  protected moved = false;
  protected last: PointerInfo;
  private readonly startScreen: Vec2;

  constructor(
    protected readonly s: Session,
    start: PointerInfo,
    protected dragging: boolean,
  ) {
    this.last = start;
    this.startScreen = start.screen;
  }

  move(p: PointerInfo) {
    const d = Math.hypot(p.screen.x - this.startScreen.x, p.screen.y - this.startScreen.y);
    if (this.dragging && d > DRAG_PX) this.moved = true;
    this.update(p);
  }

  up(p: PointerInfo) {
    if (!this.dragging) return;
    this.dragging = false;
    if (this.moved) this.finish(p);
  }

  down(p: PointerInfo): boolean {
    if (p.button !== 0) {
      this.escape();
      return true;
    }
    this.update(p);
    this.finish(p);
    return true;
  }

  key(k: KeyInfo): boolean {
    if (k.key === 'Enter') {
      this.finish(this.last);
      return true;
    }
    if (editTyped(this.s.typed, k.key, false)) {
      this.update(this.last);
      return true;
    }
    return false;
  }

  escape() {
    this.active = false;
    clearTyped(this.s.typed);
  }

  protected done() {
    this.active = false;
    clearTyped(this.s.typed);
  }

  protected typedValue(): number | null {
    const v = parseNumber(this.s.typed.len);
    return this.s.typed.len !== '' && Number.isFinite(v) ? v : null;
  }

  protected abstract update(p: PointerInfo): void;
  protected abstract finish(p: PointerInfo): void;
  abstract overlay(): Overlay;
}
