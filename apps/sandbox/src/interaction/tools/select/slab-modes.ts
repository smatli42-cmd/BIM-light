// Výběr a úpravy desky, otvoru v desce a střechy nástrojem Výběr (D2, D3; základ 25 – pohne se jen vybraný
// prvek, stěny stojí): klik vybere, tažení posune výběr, uzel obrysu se táhne nebo klikne na nové místo.
import {
  add,
  findRoof,
  findSlab,
  roofsAt,
  roundTo,
  slabOpeningsAt,
  slabsAt,
  sub,
  type Id,
  type Model,
  type Vec2,
} from '@bim-light/core';
import type { Session } from '../../../session/session.ts';
import { DRAG_PX, type Mode } from '../../mode.ts';
import { deltaFields, trackerMm } from '../../tracker-fields.ts';
import type { Overlay, PointerInfo, TrackerField } from '../../types.ts';
import { ClickOrDrag } from './click-or-drag.ts';
import { pickRoofEdge } from './roof-edge.ts';

/** Deska, otvor v desce, nebo střecha (obrys v půdorysu). */
export type OutlineKind = 'slab' | 'hole' | 'roof';

/** Co se s deskou a otvorem dělá jinak: výběr, příkazy posunu a bodu obrysu, obrys. */
const OPS = {
  slab: {
    ids: (s: Session) => s.selection.slabs,
    select: (s: Session, id: Id) => s.selection.set([], [], [], [id]),
    toggle: (s: Session, id: Id) => s.selection.toggleSlab(id),
    move: (s: Session, ids: Id[], vector: Vec2, preview: boolean) =>
      preview
        ? s.editor.preview('slab.move', { slabIds: ids, vector })
        : (s.run('slab.move', { slabIds: ids, vector }), null),
    vertex: (s: Session, id: Id, index: number, point: Vec2, preview: boolean) =>
      preview
        ? s.editor.preview('slab.moveVertex', { slabId: id, index, point })
        : (s.run('slab.moveVertex', { slabId: id, index, point }), null),
    outline: (m: Model, id: Id) => findSlab(m, id)?.outline ?? [],
  },
  hole: {
    ids: (s: Session) => s.selection.slabOpenings,
    select: (s: Session, id: Id) => s.selection.set([], [], [], [], [id]),
    toggle: (s: Session, id: Id) => s.selection.toggleSlabOpening(id),
    move: (s: Session, ids: Id[], vector: Vec2, preview: boolean) =>
      preview
        ? s.editor.preview('slabOpening.move', { openingIds: ids, vector })
        : (s.run('slabOpening.move', { openingIds: ids, vector }), null),
    vertex: (s: Session, id: Id, index: number, point: Vec2, preview: boolean) =>
      preview
        ? s.editor.preview('slabOpening.moveVertex', { openingId: id, index, point })
        : (s.run('slabOpening.moveVertex', { openingId: id, index, point }), null),
    outline: (m: Model, id: Id) => m.slabOpenings[id]?.outline ?? [],
  },
  // Střecha: klik vybere, tažení posune, uzel obrysu ref. čáry se táhne (roof.moveVertex).
  roof: {
    ids: (s: Session) => s.selection.roofs,
    select: (s: Session, id: Id) => s.selection.set([], [], [], [], [], [], [], [], [id]),
    toggle: (s: Session, id: Id) => s.selection.toggleRoof(id),
    move: (s: Session, ids: Id[], vector: Vec2, preview: boolean) =>
      preview
        ? s.editor.preview('roof.move', { roofIds: ids, vector })
        : (s.run('roof.move', { roofIds: ids, vector }), null),
    vertex: (s: Session, id: Id, index: number, point: Vec2, preview: boolean) =>
      preview
        ? s.editor.preview('roof.moveVertex', { roofId: id, index, point })
        : (s.run('roof.moveVertex', { roofId: id, index, point }), null),
    outline: (m: Model, id: Id) => findRoof(m, id)?.outline ?? [],
  },
} as const;

/** Střecha pod kurzorem: `lines` = jen klik na hranu střechy (okap, hřeben…), jinak i do plochy. */
export function roofUnder(s: Session, p: PointerInfo, lines: boolean): Id | null {
  if (s.screen.isolate || !s.filter.slabs) return null;
  return roofsAt(s.model, s.view, p.world, s.viewport.px(3), !lines)[0] ?? null;
}

/** Otvor v desce, jinak deska pod kurzorem (desky leží pod stěnami – zkouší se až po nich), pak střecha. */
export function outlineUnder(s: Session, p: PointerInfo): { kind: OutlineKind; id: Id } | null {
  if (s.screen.isolate || !s.filter.slabs) return null;
  const tol = s.viewport.px(2);
  const hole = slabOpeningsAt(s.model, s.view, p.world, tol)[0];
  if (hole) return { kind: 'hole', id: hole };
  const slab = slabsAt(s.model, s.view, p.world, tol)[0];
  if (slab) return { kind: 'slab', id: slab };
  const roof = roofUnder(s, p, false);
  return roof ? { kind: 'roof', id: roof } : null;
}

/**
 * Hrana střechy (okap, hřeben, nároží…) má přednost před stěnou pod ní (střecha leží nad): vrátí režim
 * stisku (klik vybere, tažení posune), null po Shift (přidáno / ubráno), undefined = žádná hrana.
 */
export function pressRoofLine(s: Session, p: PointerInfo): Mode | null | undefined {
  if (pickRoofEdge(s, p.screen)) return null;
  const id = roofUnder(s, p, true);
  if (!id) return undefined;
  pickOutline(s, 'roof', id, p.shift);
  return p.shift ? null : new PressOutlineMode(s, 'roof', id, p);
}

/** Shift = přidat / ubrat, jinak vybrat (když už vybraný není). */
export function pickOutline(s: Session, kind: OutlineKind, id: Id, shift: boolean) {
  if (shift) OPS[kind].toggle(s, id);
  else if (!OPS[kind].ids(s).includes(id)) OPS[kind].select(s, id);
}

const moveTracker = (v: Vec2): TrackerField[] => [
  { label: 'Posun', value: trackerMm(Math.hypot(v.x, v.y)), active: true },
  ...deltaFields({ x: 0, y: 0 }, v),
];

/** Stisk na desce / otvoru: klik vybere, tažení posune všechny vybrané stejného druhu. */
export class PressOutlineMode implements Mode {
  active = true;
  private dragging = false;
  private vector: Vec2 = { x: 0, y: 0 };

  constructor(
    private readonly s: Session,
    private readonly kind: OutlineKind,
    private readonly id: Id,
    private readonly start: PointerInfo,
  ) {}

  move(p: PointerInfo) {
    const far = Math.hypot(p.screen.x - this.start.screen.x, p.screen.y - this.start.screen.y) > DRAG_PX;
    if (!this.dragging && far) this.dragging = true;
    if (!this.dragging) return;
    const v = sub(p.world, this.start.world);
    this.vector = p.alt ? v : { x: roundTo(v.x), y: roundTo(v.y) };
  }

  up(p: PointerInfo) {
    this.active = false;
    const ops = OPS[this.kind];
    if (!this.dragging) {
      if (!p.shift) ops.select(this.s, this.id);
      return;
    }
    if (Math.hypot(this.vector.x, this.vector.y) > 0.5) ops.move(this.s, ops.ids(this.s), this.vector, false);
  }

  down() {
    return false;
  }

  escape() {
    this.active = false;
  }

  overlay(): Overlay {
    if (!this.dragging) return {};
    const ops = OPS[this.kind];
    return {
      previewModel: ops.move(this.s, ops.ids(this.s), this.vector, true),
      lines: [[this.start.world, add(this.start.world, this.vector)]],
    };
  }

  tracker() {
    return this.dragging ? moveTracker(this.vector) : null;
  }
}

/** Posun bodu obrysu: přichytává se (Alt vypne), od sousedního bodu platí úhlové kroky. */
export class OutlineVertexMode extends ClickOrDrag {
  readonly hint = 'Klikni nebo pusť bod obrysu na nové místo (přichytává se; Alt vypne).';
  private point: Vec2;
  private readonly origin: Vec2;
  private preview: Model | null = null;

  constructor(
    s: Session,
    private readonly kind: OutlineKind,
    private readonly id: Id,
    private readonly index: number,
    start: PointerInfo,
    drag: boolean,
  ) {
    super(s, start, drag);
    this.point = OPS[kind].outline(s.model, id)[index] ?? start.world;
    this.origin = this.point;
  }

  protected update(p: PointerInfo) {
    this.last = p;
    const o = OPS[this.kind].outline(this.s.model, this.id);
    const from = o[(this.index - 1 + o.length) % o.length] ?? null;
    // K vlastnímu (původnímu) obrysu se nepřichytává; pomocné čáry vedou z jeho ostatních bodů.
    const exclude = new Set([this.id]);
    const guidePoints = o.filter((_, i) => i !== this.index);
    this.point = this.s.snap(p.world, { alt: p.alt, orthoOnly: p.shift, from, exclude, guidePoints }).point;
    this.preview =
      this.moved || !this.dragging
        ? OPS[this.kind].vertex(this.s, this.id, this.index, this.point, true)
        : null;
  }

  protected finish() {
    this.done();
    this.preview = null;
    OPS[this.kind].vertex(this.s, this.id, this.index, this.point, false);
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
