// Počátek spárořezu dlažby v půdorysu (prvky stavby 9): ve vybrané místnosti s dlažbou je křížek
// v počátku mřížky; tažení ho posune (zaokrouhleně, Alt přesně) a řezy se hned přepočítají v náhledu.
// Uloží se příkazem covering.setOrigin jako posun vůči bodu zarovnání (základ 14).
import { add, roomTiling, roundTo, sub, type Id, type Vec2 } from '@bim-light/core';
import type { Session } from '../../../session/session.ts';
import { DRAG_PX, type Mode } from '../../mode.ts';
import type { Overlay, PointerInfo } from '../../types.ts';

/** Zásah do křížku (px). */
const HIT_PX = 9;

interface FloorOrigin {
  readonly roomId: Id;
  readonly anchor: Vec2;
  readonly origin: Vec2;
}

/** Počátek spárořezu podlahy vybrané místnosti (podlaha: u = x, v = y půdorysu). */
export function floorOrigin(s: Session): FloorOrigin | null {
  const id = s.selection.singleRoom;
  const room = id ? s.model.rooms[id] : undefined;
  if (!room || room.storeyId !== s.view.storeyId) return null;
  const t = roomTiling(s.model, room).find((x) => x.originKey === 'floor');
  return t ? { roomId: room.id, anchor: t.layout.anchor, origin: t.layout.origin } : null;
}

/** Křížek počátku: dvě úsečky o velikosti 12 px. */
function cross(s: Session, at: Vec2): [Vec2, Vec2][] {
  const d = s.viewport.px(12);
  return [
    [add(at, { x: -d, y: 0 }), add(at, { x: d, y: 0 })],
    [add(at, { x: 0, y: -d }), add(at, { x: 0, y: d })],
  ];
}

/** Přidá k překryvu nástroje značku počátku ve vybrané místnosti (bez tažení). */
export function withTileOrigin(s: Session, base: Overlay): Overlay {
  const o = floorOrigin(s);
  if (!o) return base;
  return {
    ...base,
    guides: [...(base.guides ?? []), ...cross(s, o.origin)],
    markers: [...(base.markers ?? []), o.origin],
  };
}

class TileOriginMode implements Mode {
  active = true;
  private dragging = false;
  private vector: Vec2 = { x: 0, y: 0 };
  readonly hint = 'Táhni počátek spárořezu dlažby; Alt = bez zaokrouhlení.';

  constructor(
    private readonly s: Session,
    private readonly o: FloorOrigin,
    private readonly start: PointerInfo,
  ) {}

  private params() {
    const at = add(this.o.origin, this.vector);
    return { roomId: this.o.roomId, place: 'floor', offset: sub(at, this.o.anchor) };
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
    if (this.dragging && Math.hypot(this.vector.x, this.vector.y) > 0.5)
      this.s.run('covering.setOrigin', this.params());
  }

  down() {
    return false;
  }

  escape() {
    this.active = false;
  }

  overlay(): Overlay {
    const at = add(this.o.origin, this.vector);
    return {
      ...(this.dragging && { previewModel: this.s.editor.preview('covering.setOrigin', this.params()) }),
      guides: cross(this.s, at),
      markers: [at],
      selected: [this.o.roomId],
    };
  }
}

/** Stisk na křížku počátku vybrané místnosti → tažení; jinde nic. */
export function pressTileOrigin(s: Session, p: PointerInfo): Mode | null {
  const o = floorOrigin(s);
  if (!o) return null;
  const c = s.viewport.toScreen(o.origin);
  return Math.hypot(c.x - p.screen.x, c.y - p.screen.y) <= HIT_PX ? new TileOriginMode(s, o, p) : null;
}
