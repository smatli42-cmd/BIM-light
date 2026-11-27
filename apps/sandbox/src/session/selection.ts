// Výběr stěn, otvorů, desek a kót (pravidla-interakce: Výběr). Jen stav rozhraní, model se nemění.
import type { Id, Model } from '@bim-light/core';

export class Selection {
  walls: Id[] = [];
  dims: Id[] = [];
  /** Vybrané otvory (plán stěn Z4). */
  openings: Id[] = [];
  /** Vybrané desky (D2). */
  slabs: Id[] = [];

  get empty(): boolean {
    return this.count === 0;
  }

  private get count(): number {
    return this.walls.length + this.dims.length + this.openings.length + this.slabs.length;
  }

  /** Právě jedna vybraná stěna (ukazují se dočasné kóty a uzly). */
  get single(): Id | null {
    return this.walls.length === 1 && this.count === 1 ? (this.walls[0] as Id) : null;
  }

  /** Právě jeden vybraný otvor (dočasné kóty k sousedům, panel otvoru). */
  get singleOpening(): Id | null {
    return this.openings.length === 1 && this.count === 1 ? (this.openings[0] as Id) : null;
  }

  /** Právě jedna vybraná deska (uzly obrysu). */
  get singleSlab(): Id | null {
    return this.slabs.length === 1 && this.count === 1 ? (this.slabs[0] as Id) : null;
  }

  set(
    walls: readonly Id[],
    dims: readonly Id[] = [],
    openings: readonly Id[] = [],
    slabs: readonly Id[] = [],
  ) {
    this.walls = [...new Set(walls)];
    this.dims = [...new Set(dims)];
    this.openings = [...new Set(openings)];
    this.slabs = [...new Set(slabs)];
  }

  clear() {
    this.set([]);
  }

  private static toggle(list: Id[], id: Id): Id[] {
    return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
  }

  /** Shift+klik: přidá nebo ubere. */
  toggleWall(id: Id) {
    this.walls = Selection.toggle(this.walls, id);
  }

  toggleDim(id: Id) {
    this.dims = Selection.toggle(this.dims, id);
  }

  toggleOpening(id: Id) {
    this.openings = Selection.toggle(this.openings, id);
  }

  toggleSlab(id: Id) {
    this.slabs = Selection.toggle(this.slabs, id);
  }

  has(id: Id): boolean {
    return [this.walls, this.dims, this.openings, this.slabs].some((l) => l.includes(id));
  }

  /** Parametry příkazu selection.delete pro celý výběr. */
  deleteParams() {
    return { wallIds: this.walls, dimensionIds: this.dims, openingIds: this.openings, slabIds: this.slabs };
  }

  /** Po Undo / smazání odstraní id, která už v modelu nejsou. */
  prune(model: Model) {
    this.walls = this.walls.filter((id) => model.elements[id]?.category === 'wall');
    this.dims = this.dims.filter((id) => model.dimensions[id]);
    this.openings = this.openings.filter((id) => model.openings[id]);
    this.slabs = this.slabs.filter((id) => model.elements[id]?.category === 'slab');
  }
}
