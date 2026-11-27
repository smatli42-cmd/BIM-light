// Výběr místnosti nástrojem Výběr (prvky stavby 9; jako Revit Room): razítko i plocha uvnitř obrysu
// místnost vyberou; tažení posune jen razítko (obrys se počítá ze stěn, ty stojí – základ 25).
// Plocha místnosti ustoupí desce, když je klik u hrany desky (hrana zůstane dosažitelná).
import {
  add,
  roomsAt,
  roomStampsAt,
  roundTo,
  slabsAt,
  stampCenter,
  sub,
  type Id,
  type Vec2,
} from '@bim-light/core';
import type { Session } from '../../../session/session.ts';
import { DRAG_PX, type Mode } from '../../mode.ts';
import { segDist } from '../../screen.ts';
import type { Overlay, PointerInfo } from '../../types.ts';
import { outlineUnder } from './slab-modes.ts';

/** Razítko místnosti pod kurzorem (je nad deskami). */
export function stampUnder(s: Session, p: PointerInfo): Id | null {
  if (s.screen.isolate || !s.filter.rooms) return null;
  return roomStampsAt(s.model, s.view, p.world, s.viewport.px(3))[0] ?? null;
}

/** Je kurzor u hrany některé desky pod ním? (Pak má přednost deska.) */
function nearSlabEdge(s: Session, p: PointerInfo): boolean {
  if (!s.filter.slabs) return false;
  return slabsAt(s.model, s.view, p.world, s.viewport.px(6)).some((id) => {
    const el = s.model.elements[id];
    const o = el?.category === 'slab' ? el.outline.map((q) => s.viewport.toScreen(q)) : [];
    return o.some((a, i) => segDist(p.screen, a, o[(i + 1) % o.length] as Vec2) <= 6);
  });
}

/** Místnost pod kurzorem (plocha uvnitř obrysu), pokud není kurzor u hrany desky. */
export function roomUnder(s: Session, p: PointerInfo): Id | null {
  if (s.screen.isolate || !s.filter.rooms || nearSlabEdge(s, p)) return null;
  return roomsAt(s.model, s.view, p.world)[0] ?? null;
}

/** Plošný prvek pod kurzorem pro kartu prvku: razítko, místnost, otvor v desce nebo deska. */
export const flatUnder = (s: Session, p: PointerInfo): Id | null =>
  stampUnder(s, p) ?? roomUnder(s, p) ?? outlineUnder(s, p)?.id ?? null;

/** Stisk na místnosti: klik vybere (Shift přidá / ubere), tažení posune razítko. */
export class PressRoomMode implements Mode {
  active = true;
  private dragging = false;
  private vector: Vec2 = { x: 0, y: 0 };
  readonly hint = 'Táhni razítko místnosti; obrys se počítá ze stěn.';

  constructor(
    private readonly s: Session,
    private readonly id: Id,
    private readonly start: PointerInfo,
  ) {}

  private target(): Vec2 | null {
    const r = this.s.model.rooms[this.id];
    return r ? add(stampCenter(r), this.vector) : null;
  }

  move(p: PointerInfo) {
    const far = Math.hypot(p.screen.x - this.start.screen.x, p.screen.y - this.start.screen.y) > DRAG_PX;
    if (!this.dragging && far) this.dragging = true;
    if (!this.dragging) return;
    const v = sub(p.world, this.start.world);
    this.vector = p.alt ? v : { x: roundTo(v.x), y: roundTo(v.y) };
  }

  up() {
    this.active = false;
    const at = this.target();
    if (this.dragging && at && Math.hypot(this.vector.x, this.vector.y) > 0.5)
      this.s.run('room.update', { roomId: this.id, stampAt: at });
  }

  down() {
    return false;
  }

  escape() {
    this.active = false;
  }

  overlay(): Overlay {
    const at = this.target();
    if (!this.dragging || !at) return { selected: [this.id] };
    return {
      previewModel: this.s.editor.preview('room.update', { roomId: this.id, stampAt: at }),
      lines: [[this.start.world, add(this.start.world, this.vector)]],
      selected: [this.id],
    };
  }
}

/** Vybere místnost (Shift = přidat / ubrat) a vrátí režim tažení razítka. */
export function pressRoom(s: Session, id: Id, p: PointerInfo): Mode | null {
  if (p.shift) {
    s.selection.toggleRoom(id);
    return null;
  }
  if (!s.selection.rooms.includes(id)) s.selection.set([], [], [], [], [], [id]);
  return new PressRoomMode(s, id, p);
}
