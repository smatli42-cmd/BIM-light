// Nástroj Otvor (plán stěn Z4; základ 20: popíše jen své kroky). Klik na stěnu vloží otvor se středem
// pod kurzorem; přichytává se ke středu stěny, hranou k líci v rohu a k otvorům, osou k otvorům v jiné
// stěně (Alt vypne). Tracker ukazuje vzdálenosti k sousedům jako dočasné kóty.
import {
  centerOf,
  formatLength,
  hostAt,
  openingOutline,
  openingTempDimensions,
  snapOpening,
  type Id,
  type Model,
  type Opening,
} from '@bim-light/core';
import type { Session } from '../../session/session.ts';
import { SNAP_PX } from '../../session/session.ts';
import type { KeyInfo, Overlay, PointerInfo, Tool, TrackerField } from '../types.ts';

interface Place {
  readonly wallId: Id;
  readonly offset: number;
  readonly label: string | null;
}

export class OpeningTool implements Tool {
  readonly id = 'opening';
  private at: Place | null = null;

  constructor(private readonly s: Session) {}

  hint(): string {
    return 'Klikni na stěnu: vloží se otvor (rozměry v panelu vpravo). Přichytává se ke středu stěny, k líci v rohu a k otvorům; Alt vypne. Esc ukončí.';
  }

  private params(p: Place) {
    return {
      wallId: p.wallId,
      offset: p.offset,
      ...this.s.openingDefaults,
      status: this.s.options.newStatus,
    };
  }

  private place(p: PointerInfo): Place | null {
    const s = this.s;
    const hit = hostAt(s.model, s.storeyId, p.world, undefined, s.viewport.px(6));
    if (!hit) return null;
    const w = s.openingDefaults.width;
    const snap = p.alt
      ? { offset: hit.s - w / 2, label: null }
      : snapOpening(s.model, hit.wall.id, hit.s, w, s.viewport.px(SNAP_PX));
    return { wallId: hit.wall.id, offset: snap.offset, label: snap.label };
  }

  /** Model s rozpracovaným otvorem (náhled), nebo null, když se otvor do stěny nevejde. */
  private preview(): { model: Model; opening: Opening } | null {
    if (!this.at) return null;
    const m = this.s.editor.preview('opening.create', this.params(this.at));
    const o = m && Object.values(m.openings).find((x) => !this.s.model.openings[x.id]);
    return m && o ? { model: m, opening: o } : null;
  }

  down(p: PointerInfo) {
    if (p.button !== 0) return;
    this.at = this.place(p);
    if (this.at) this.s.run('opening.create', this.params(this.at));
  }

  move(p: PointerInfo) {
    this.at = this.place(p);
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
    const snap = this.at?.label ? { point: centerOf(pv.model, pv.opening), label: this.at.label } : null;
    return { previewModel: pv.model, ghosts: [openingOutline(pv.model, pv.opening)], snap };
  }

  tracker(): readonly TrackerField[] | null {
    const pv = this.preview();
    const d = this.s.openingDefaults;
    const fields: TrackerField[] = [{ label: 'Otvor', value: `${d.width} × ${d.height}`, active: false }];
    if (!pv) return this.at ? [...fields, { label: '', value: 'nevejde se', active: false }] : null;
    const temps = openingTempDimensions(pv.model, pv.opening.id, 'ref');
    for (const t of temps)
      fields.push({
        label: t.own.face === 'start' ? 'Odstup – začátek' : 'Odstup – konec',
        value: formatLength(t.value),
        active: false,
      });
    return fields;
  }
}
