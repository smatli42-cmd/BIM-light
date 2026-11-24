// Výřez obrazovky: převod mm modelu ↔ pixely. Osa Y modelu jde nahoru, obrazovky dolů.
import type { Vec2 } from '@bim-light/core';

export class Viewport {
  /** Pixelů na mm modelu. */
  s = 0.08;
  ox = 400;
  oy = 400;
  width = 800;
  height = 800;

  toScreen(p: Vec2): Vec2 {
    return { x: this.ox + p.x * this.s, y: this.oy - p.y * this.s };
  }

  toWorld(p: Vec2): Vec2 {
    return { x: (p.x - this.ox) / this.s, y: (this.oy - p.y) / this.s };
  }

  /** Vzdálenost v px převedená na mm modelu (tolerance přichycení a výběru). */
  px(n: number): number {
    return n / this.s;
  }

  resize(width: number, height: number) {
    const centre = this.toWorld({ x: this.width / 2, y: this.height / 2 });
    this.width = width;
    this.height = height;
    this.ox = width / 2 - centre.x * this.s;
    this.oy = height / 2 + centre.y * this.s;
  }

  zoomAt(screen: Vec2, k: number) {
    const w = this.toWorld(screen);
    this.s = Math.max(0.005, Math.min(2, this.s * k));
    this.ox = screen.x - w.x * this.s;
    this.oy = screen.y + w.y * this.s;
  }

  pan(dx: number, dy: number) {
    this.ox += dx;
    this.oy += dy;
  }

  /** Přiblíží na obdélník v mm (Home, zoom na výběr, okno). */
  zoomToBox(x0: number, y0: number, x1: number, y1: number, margin = 80) {
    const w = Math.max(1, x1 - x0);
    const h = Math.max(1, y1 - y0);
    this.s = Math.max(
      0.005,
      Math.min(2, Math.min((this.width - 2 * margin) / w, (this.height - 2 * margin) / h)),
    );
    this.ox = this.width / 2 - ((x0 + x1) / 2) * this.s;
    this.oy = this.height / 2 + ((y0 + y1) / 2) * this.s;
  }
}
