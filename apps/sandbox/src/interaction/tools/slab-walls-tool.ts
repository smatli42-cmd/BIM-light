// Nástroj Deska, metoda „podle stěn“ (D2; Revit „Podlaha – Vybrat stěny“): klik na stěnu ji přidá do
// obrysu (znovu = ubere), náhled ukazuje obrys po vnitřním líci nebo líci jádra (info box), Enter /
// dvojklik do volna / pravé tlačítko desku vytvoří. Výpočet obrysu je v jádře (slab.create s walls).
import { selectableWallGeometry, wallsAt, type Id, type Model, type Slab } from '@bim-light/core';
import type { Session } from '../../session/session.ts';
import { slabCreateParams } from '../../session/slab-defaults.ts';
import type { KeyInfo, Overlay, PointerInfo, Tool, TrackerField } from '../types.ts';

export class SlabWallsTool implements Tool {
  readonly id = 'slab';
  private picked: Id[] = [];
  private hover: Id | null = null;

  constructor(private readonly s: Session) {}

  hint(): string {
    return this.picked.length < 2
      ? 'Klikni na stěny kolem desky (znovu klik stěnu ubere).'
      : 'Klikni další stěnu; Enter, dvojklik do volna nebo pravé tlačítko vytvoří desku. Esc zruší výběr stěn.';
  }

  private wallAt(p: PointerInfo): Id | null {
    const s = this.s;
    return wallsAt(selectableWallGeometry(s.model, s.view), p.world, s.viewport.px(2))[0] ?? null;
  }

  private params() {
    return { ...slabCreateParams(this.s), walls: { wallIds: this.picked, boundary: this.s.slab.boundary } };
  }

  /** Model s novou deskou (náhled), nebo null, když stěny obrys netvoří. */
  private preview(): { model: Model; slab: Slab } | null {
    if (this.picked.length < 2) return null;
    const m = this.s.editor.preview('slab.create', this.params());
    const slab = m && Object.values(m.elements).find((e) => !this.s.model.elements[e.id]);
    return m && slab?.category === 'slab' ? { model: m, slab } : null;
  }

  private create() {
    if (this.picked.length < 2) return;
    if (this.s.run('slab.create', this.params()).ok) this.picked = [];
  }

  move(p: PointerInfo) {
    this.hover = this.wallAt(p);
  }

  down(p: PointerInfo) {
    if (p.button === 2) return this.create();
    if (p.button !== 0) return;
    const id = this.wallAt(p);
    if (!id) return;
    this.picked = this.picked.includes(id) ? this.picked.filter((w) => w !== id) : [...this.picked, id];
  }

  up() {}

  dblclick() {
    this.create();
  }

  key(k: KeyInfo): boolean {
    if (k.key !== 'Enter' || !this.picked.length) return false;
    this.create();
    return true;
  }

  escape(): boolean {
    if (!this.picked.length) return false;
    this.picked = [];
    return true;
  }

  overlay(): Overlay {
    const pv = this.preview();
    const hover = this.hover && !this.picked.includes(this.hover) ? [this.hover] : [];
    return { hover, ghosts: pv ? [pv.slab.outline] : [], selected: this.picked };
  }

  tracker(): readonly TrackerField[] | null {
    if (!this.picked.length) return null;
    const ok = this.preview() !== null;
    return [
      { label: 'Stěny', value: String(this.picked.length), active: false },
      ...(this.picked.length >= 2 && !ok ? [{ label: '', value: 'obrys se neuzavře', active: false }] : []),
    ];
  }
}
