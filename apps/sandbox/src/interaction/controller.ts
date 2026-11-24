// Rozvod událostí myši a klávesnice k aktivnímu nástroji. Bez DOM: dostává už převedené
// události, takže jde testovat i mimo prohlížeč.
import type { Vec2 } from '@bim-light/core';
import type { Session } from '../session/session.ts';
import { handleKey } from './keyboard.ts';
import type { KeyInfo, PointerInfo } from './types.ts';

export interface RawPointer {
  readonly x: number;
  readonly y: number;
  readonly button: number;
  readonly shift: boolean;
  readonly ctrl: boolean;
  readonly alt: boolean;
}

export class Controller {
  private pan: { x: number; y: number } | null = null;

  constructor(private readonly s: Session) {}

  private info(r: RawPointer): PointerInfo {
    const screen: Vec2 = { x: r.x, y: r.y };
    return {
      screen,
      world: this.s.viewport.toWorld(screen),
      button: r.button,
      shift: r.shift,
      ctrl: r.ctrl,
      alt: r.alt,
    };
  }

  private track(p: PointerInfo) {
    this.s.cursor = { screen: p.screen, world: p.world, inside: true };
  }

  down(r: RawPointer) {
    const s = this.s;
    if (r.button === 1) {
      this.pan = { x: r.x, y: r.y };
      return;
    }
    s.menu = null;
    s.valueEdit = null;
    const p = this.info(r);
    this.track(p);
    s.tool.down(p);
    s.snapCycle = 0;
    s.changed();
  }

  move(r: RawPointer) {
    if (this.pan) {
      this.s.viewport.pan(r.x - this.pan.x, r.y - this.pan.y);
      this.pan = { x: r.x, y: r.y };
      this.s.changed();
      return;
    }
    const p = this.info(r);
    this.track(p);
    this.s.tool.move(p);
    this.s.changed();
  }

  up(r: RawPointer) {
    if (r.button === 1) {
      this.pan = null;
      return;
    }
    const p = this.info(r);
    this.s.tool.up(p);
    this.s.changed();
  }

  dblclick(r: RawPointer) {
    this.s.tool.dblclick?.(this.info(r));
    this.s.changed();
  }

  leave() {
    this.s.cursor = { ...this.s.cursor, inside: false };
    this.s.changed();
  }

  wheel(x: number, y: number, deltaY: number) {
    this.s.viewport.zoomAt({ x, y }, Math.exp(-deltaY * 0.0015));
    this.s.changed();
  }

  /** Vrací true, když klávesu zpracoval. */
  key(k: KeyInfo): boolean {
    const used = handleKey(this.s, k);
    if (used) {
      const c = this.s.cursor;
      if (c.inside)
        this.s.tool.move(
          this.info({ x: c.screen.x, y: c.screen.y, button: 0, shift: k.shift, ctrl: k.ctrl, alt: k.alt }),
        );
      this.s.changed();
    }
    return used;
  }
}
