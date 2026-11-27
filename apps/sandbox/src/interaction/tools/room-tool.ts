// Nástroj Místnost (prvky stavby 9; Revit Room, Archicad Zone kouzelnou hůlkou): kurzor ukazuje obrys,
// který by místnost dostala (spočítaný z líců stěn), klik vloží místnost s dalším volným číslem.
// Neuzavřený prostor se vloží s varováním, bod ve stěně se odmítne (hláška z příkazu).
import { roomGeometry, type Model, type Room, type Vec2 } from '@bim-light/core';
import type { Session } from '../../session/session.ts';
import type { KeyInfo, Overlay, PointerInfo, Tool, TrackerField } from '../types.ts';

export class RoomTool implements Tool {
  readonly id = 'room';
  private at: Vec2 | null = null;

  constructor(private readonly s: Session) {}

  hint(): string {
    return 'Klikni dovnitř prostoru ohraničeného stěnami: vloží se místnost (obrys z líců stěn, plocha podle ČSN 73 4301). Esc ukončí.';
  }

  private params(at: Vec2) {
    return { storeyId: this.s.storeyId, point: at, status: this.s.options.newStatus };
  }

  /** Model s místností pod kurzorem (náhled obrysu) a ta místnost. */
  private preview(): { model: Model; room: Room } | null {
    if (!this.at) return null;
    const m = this.s.editor.preview('room.create', this.params(this.at));
    const r = m && Object.values(m.rooms).find((x) => !this.s.model.rooms[x.id]);
    return m && r ? { model: m, room: r } : null;
  }

  down(p: PointerInfo) {
    if (p.button !== 0) return;
    this.at = p.world;
    this.s.run('room.create', this.params(p.world));
  }

  move(p: PointerInfo) {
    this.at = p.world;
  }

  up() {}

  key(_k: KeyInfo): boolean {
    return false;
  }

  escape(): boolean {
    return false;
  }

  overlay(): Overlay {
    const pv = this.preview();
    if (!pv) return {};
    const g = roomGeometry(pv.model, pv.room);
    return { ghosts: [g.outline, ...g.holes].filter((l) => l.length > 0) };
  }

  tracker(): readonly TrackerField[] | null {
    const pv = this.preview();
    if (!pv) return null;
    const g = roomGeometry(pv.model, pv.room);
    const area = g.state === 'ok' ? `${(g.area / 1e6).toFixed(2).replace('.', ',')} m²` : 'neuzavřená';
    return [{ label: 'Plocha', value: area, active: true }];
  }
}
