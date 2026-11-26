// Změnit velikost (Ctrl+K, vzor Arditu / Resize v Archicadu): nejdřív okno s měřítkem v %, pak klik
// na výchozí bod – vzdálenosti od něj se změní v daném poměru, tloušťky stěn zůstávají. Náhled ukazuje
// výsledek kolem bodu pod kurzorem. Výpočet je v jádře (příkaz wall.scale).
import { add, mul, sub, type Vec2 } from '@bim-light/core';
import type { Overlay } from '../../types.ts';
import { PointCommand } from './base.ts';

export class ScaleTool extends PointCommand {
  readonly id = 'scale';
  /** Okno s měřítkem je otevřené (klik do výkresu se zatím nebere). */
  dialog = true;
  protected readonly steps = [
    'Klikni výchozí bod – vzdálenosti od něj se změní v daném poměru. Tloušťky stěn zůstávají. Esc ruší.',
  ];

  override hint(): string {
    return this.dialog ? 'Nastav měřítko v okně a pokračuj.' : super.hint();
  }

  private factor(): number {
    return this.s.options.scalePercent / 100;
  }

  /** Pokračovat z okna: teď se klikne výchozí bod. */
  confirm() {
    this.dialog = false;
    this.s.changed();
  }

  override down(p: Parameters<PointCommand['down']>[0]) {
    if (this.dialog) return;
    super.down(p);
  }

  protected click(p: Vec2) {
    const factor = this.factor();
    if (factor > 0 && Math.abs(factor - 1) > 1e-9)
      this.s.run('wall.scale', {
        wallIds: this.ids,
        origin: p,
        factor,
        scaleOpenings: this.s.options.scaleOpenings,
      });
    this.s.setTool('select');
  }

  protected preview(): Overlay {
    const o = this.cur;
    if (this.dialog || !o) return {};
    const k = this.factor();
    return { ghosts: this.ghosts((q) => add(o, mul(sub(q, o), k))), markers: [o] };
  }
}
