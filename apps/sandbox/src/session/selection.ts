// Výběr stěn, otvorů a kót (pravidla-interakce: Výběr). Jen stav rozhraní, model se nemění.
import type { Id, Model } from '@bim-light/core';

export class Selection {
  walls: Id[] = [];
  dims: Id[] = [];
  /** Vybrané otvory (plán stěn Z4). */
  openings: Id[] = [];

  get empty(): boolean {
    return this.walls.length === 0 && this.dims.length === 0 && this.openings.length === 0;
  }

  /** Právě jedna vybraná stěna (ukazují se dočasné kóty a uzly). */
  get single(): Id | null {
    return this.walls.length === 1 && this.dims.length === 0 && this.openings.length === 0
      ? (this.walls[0] as Id)
      : null;
  }

  /** Právě jeden vybraný otvor (dočasné kóty k sousedům, panel otvoru). */
  get singleOpening(): Id | null {
    return this.openings.length === 1 && this.walls.length === 0 && this.dims.length === 0
      ? (this.openings[0] as Id)
      : null;
  }

  set(walls: readonly Id[], dims: readonly Id[] = [], openings: readonly Id[] = []) {
    this.walls = [...new Set(walls)];
    this.dims = [...new Set(dims)];
    this.openings = [...new Set(openings)];
  }

  clear() {
    this.set([]);
  }

  /** Shift+klik: přidá nebo ubere. */
  toggleWall(id: Id) {
    this.walls = this.walls.includes(id) ? this.walls.filter((w) => w !== id) : [...this.walls, id];
  }

  toggleDim(id: Id) {
    this.dims = this.dims.includes(id) ? this.dims.filter((d) => d !== id) : [...this.dims, id];
  }

  toggleOpening(id: Id) {
    this.openings = this.openings.includes(id)
      ? this.openings.filter((o) => o !== id)
      : [...this.openings, id];
  }

  has(id: Id): boolean {
    return this.walls.includes(id) || this.dims.includes(id) || this.openings.includes(id);
  }

  /** Po Undo / smazání odstraní id, která už v modelu nejsou. */
  prune(model: Model) {
    this.walls = this.walls.filter((id) => model.elements[id]);
    this.dims = this.dims.filter((id) => model.dimensions[id]);
    this.openings = this.openings.filter((id) => model.openings[id]);
  }
}
