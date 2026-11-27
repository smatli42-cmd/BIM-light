// Výběr stěn, otvorů (ve stěnách i deskách), desek, místností, řezů a kót (pravidla-interakce: Výběr). Jen stav rozhraní, model se nemění.
import type { FaceSide, Id, Model } from '@bim-light/core';

/** Vybraný líc stěny v místnosti (přepis zón povrchů jedné stěny). */
export interface FacePick {
  readonly roomId: Id;
  readonly wallId: Id;
  readonly side: FaceSide;
}

export class Selection {
  walls: Id[] = [];
  dims: Id[] = [];
  /** Vybrané otvory (plán stěn Z4). */
  openings: Id[] = [];
  /** Vybrané desky (D2). */
  slabs: Id[] = [];
  /** Vybrané otvory v deskách (D3). */
  slabOpenings: Id[] = [];
  /** Vybrané místnosti. */
  rooms: Id[] = [];
  /** Vybrané řezy (značka v půdorysu). */
  sections: Id[] = [];
  /** Vybrané výškové kóty v okně řezu. */
  levelDims: Id[] = [];
  /** Vybraný líc stěny ve vybrané místnosti (klik u líce). */
  face: FacePick | null = null;

  get empty(): boolean {
    return this.count === 0;
  }

  private get count(): number {
    const n = this.walls.length + this.dims.length + this.openings.length;
    return (
      n +
      this.slabs.length +
      this.slabOpenings.length +
      this.rooms.length +
      this.sections.length +
      this.levelDims.length
    );
  }

  /** Právě jedna vybraná stěna (ukazují se dočasné kóty a uzly). */
  get single(): Id | null {
    return this.walls.length === 1 && this.count === 1 ? (this.walls[0] as Id) : null;
  }

  /** Právě jeden vybraný otvor (dočasné kóty k sousedům, panel otvoru). */
  get singleOpening(): Id | null {
    return this.openings.length === 1 && this.count === 1 ? (this.openings[0] as Id) : null;
  }

  /** Právě jeden vybraný otvor v desce (uzly obrysu). */
  get singleSlabOpening(): Id | null {
    return this.slabOpenings.length === 1 && this.count === 1 ? (this.slabOpenings[0] as Id) : null;
  }

  /** Právě jedna vybraná deska (uzly obrysu). */
  get singleSlab(): Id | null {
    return this.slabs.length === 1 && this.count === 1 ? (this.slabs[0] as Id) : null;
  }

  /** Právě jedna vybraná místnost (info box místnosti). */
  get singleRoom(): Id | null {
    return this.rooms.length === 1 && this.count === 1 ? (this.rooms[0] as Id) : null;
  }

  set(
    walls: readonly Id[],
    dims: readonly Id[] = [],
    openings: readonly Id[] = [],
    slabs: readonly Id[] = [],
    slabOpenings: readonly Id[] = [],
    rooms: readonly Id[] = [],
    sections: readonly Id[] = [],
    levelDims: readonly Id[] = [],
  ) {
    this.walls = [...new Set(walls)];
    this.dims = [...new Set(dims)];
    this.openings = [...new Set(openings)];
    this.slabs = [...new Set(slabs)];
    this.slabOpenings = [...new Set(slabOpenings)];
    this.rooms = [...new Set(rooms)];
    this.sections = [...new Set(sections)];
    this.levelDims = [...new Set(levelDims)];
    if (this.face && !this.rooms.includes(this.face.roomId)) this.face = null;
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

  toggleSlabOpening(id: Id) {
    this.slabOpenings = Selection.toggle(this.slabOpenings, id);
  }

  toggleSection(id: Id) {
    this.sections = Selection.toggle(this.sections, id);
  }

  toggleLevelDim(id: Id) {
    this.levelDims = Selection.toggle(this.levelDims, id);
  }

  toggleRoom(id: Id) {
    this.rooms = Selection.toggle(this.rooms, id);
  }

  has(id: Id): boolean {
    const lists = [
      this.walls,
      this.dims,
      this.openings,
      this.slabs,
      this.slabOpenings,
      this.rooms,
      this.sections,
      this.levelDims,
    ];
    return lists.some((l) => l.includes(id));
  }

  /** Parametry příkazu selection.delete pro celý výběr. */
  deleteParams() {
    return {
      wallIds: this.walls,
      dimensionIds: this.dims,
      openingIds: this.openings,
      slabIds: this.slabs,
      slabOpeningIds: this.slabOpenings,
      roomIds: this.rooms,
      sectionIds: this.sections,
      levelDimIds: this.levelDims,
    };
  }

  /** Po Undo / smazání odstraní id, která už v modelu nejsou. */
  prune(model: Model) {
    this.walls = this.walls.filter((id) => model.elements[id]?.category === 'wall');
    this.dims = this.dims.filter((id) => model.dimensions[id]);
    this.openings = this.openings.filter((id) => model.openings[id]);
    this.slabs = this.slabs.filter((id) => model.elements[id]?.category === 'slab');
    this.slabOpenings = this.slabOpenings.filter((id) => model.slabOpenings[id]);
    this.rooms = this.rooms.filter((id) => model.rooms[id]);
    this.sections = this.sections.filter((id) => model.sections[id]);
    this.levelDims = this.levelDims.filter((id) => model.levelDims[id] || model.planLevelDims[id]);
    if (this.face && (!model.rooms[this.face.roomId] || !model.elements[this.face.wallId])) this.face = null;
  }
}
