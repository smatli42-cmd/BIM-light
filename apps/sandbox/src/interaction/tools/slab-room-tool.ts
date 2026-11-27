// Nástroj Deska, metoda „podle místnosti“ (Revit podlaha z hranice místnosti, Archicad deska kouzelnou
// hůlkou): klik do místnosti vytvoří podlahu vázanou na místnost – obrys od líce k líci i s ostrovy se
// po posunu stěn přepočítá v jádře (slab.create s roomId). Náhled ukazuje obrys místnosti pod kurzorem.
import { allRoomGeometry, roomsAt, type Id, type Vec2 } from '@bim-light/core';
import type { Session } from '../../session/session.ts';
import { slabCreateParams } from '../../session/slab-defaults.ts';
import type { KeyInfo, Overlay, PointerInfo, Tool, TrackerField } from '../types.ts';

export class SlabRoomTool implements Tool {
  readonly id = 'slab';
  private hover: Id | null = null;

  constructor(private readonly s: Session) {}

  hint(): string {
    return 'Klikni do místnosti: vznikne podlaha s obrysem místnosti (přepočítá se s ní).';
  }

  private roomAt(p: PointerInfo): Id | null {
    return roomsAt(this.s.model, this.s.view, p.world)[0] ?? null;
  }

  private loops(): (readonly Vec2[])[] {
    const g = this.hover && allRoomGeometry(this.s.model, this.s.view.storeyId).get(this.hover);
    return g && g.state === 'ok' ? [g.outline, ...g.holes] : [];
  }

  move(p: PointerInfo) {
    this.hover = this.roomAt(p);
  }

  down(p: PointerInfo) {
    if (p.button !== 0) return;
    const roomId = this.roomAt(p);
    if (!roomId) return this.s.toast('Tady není místnost – nejdřív ji vytvoř nástrojem Místnost (N).', 'bad');
    this.s.run('slab.create', { ...slabCreateParams(this.s), roomId, slabFunction: 'floor' });
  }

  up() {}

  key(_k: KeyInfo): boolean {
    return false;
  }

  escape(): boolean {
    return false;
  }

  overlay(): Overlay {
    return { ghosts: this.loops() };
  }

  tracker(): readonly TrackerField[] | null {
    const r = this.hover ? this.s.model.rooms[this.hover] : undefined;
    return r ? [{ label: 'Místnost', value: `${r.number} ${r.name}`.trim(), active: false }] : null;
  }
}
