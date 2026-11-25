// Nástroj Výběr (pravidla-interakce: Výběr; katalog kreslení 3–5; základ 25).
// Klik vybere, Shift přidá/ubere, tažení z prázdna = rámeček, tažení stěny = přesun výběru,
// uzel a líc vybrané stěny se táhnou hned, kóty se táhnou a čísla se mění kliknutím.
import { openingAt, pickFace, selectableWallGeometry, wallsAt, type Id } from '@bim-light/core';
import type { Session } from '../../../session/session.ts';
import { hitAt, type Hit } from '../../hits.ts';
import type { Mode } from '../../mode.ts';
import { PlacingMode, type DraftItem } from '../../placing.ts';
import type { TempDimView } from '../../temp-layout.ts';
import type { KeyInfo, Overlay, PointerInfo, Tool, TrackerField } from '../../types.ts';
import { PermDimDragMode, TempDimDragMode } from './dim-drag.ts';
import { BoxMode, PressWallMode } from './drag-modes.ts';
import { dimMenu, edgeMenu, nodeMenu, openingMenu, wallMenu } from './menus.ts';
import { PressOpeningMode } from './opening-modes.ts';
import { NodeMode } from './node-mode.ts';
import { OffsetMode } from './wall-modes.ts';

function itemFromTemp(t: TempDimView): DraftItem {
  const temp = t.temp;
  return temp.kind === 'cross'
    ? { kind: 'linear', refs: [temp.own, temp.other], ownerRef: 0 }
    : { kind: 'length', ref: temp.own };
}

export class SelectTool implements Tool {
  readonly id = 'select';
  private mode: Mode | null = null;
  private hover: Id | null = null;
  private tab = 0;

  constructor(private readonly s: Session) {}

  hint(): string {
    if (this.mode?.active && this.mode.hint) return this.mode.hint;
    if (this.s.selection.singleOpening)
      return 'Táhni otvor po stěně nebo na jinou stěnu; klik na číslo kóty ho posune. Del smaže.';
    if (this.s.selection.single)
      return 'Táhni uzel nebo líc; klik na číslo kóty změní hodnotu; kolečko = trvalá kóta. Mezerník přehodí stranu.';
    return 'Klikni na stěnu, Shift přidá. Tažení zleva = celé, zprava = i protnuté. Ctrl+A vše, Del smaže.';
  }

  /** Otvor pod kurzorem má přednost před stěnou, ve které leží (plán stěn Z4). */
  private openingUnder(p: PointerInfo): Id | null {
    return openingAt(this.s.model, this.s.view, p.world, this.s.viewport.px(3));
  }

  private wallsUnder(p: PointerInfo): Id[] {
    return wallsAt(selectableWallGeometry(this.s.model, this.s.view), p.world, this.s.viewport.px(2));
  }

  down(p: PointerInfo) {
    if (this.mode?.active && this.mode.down(p)) return this.cleanup();
    this.mode = null;
    if (p.button === 2) return this.context(p);
    if (p.button !== 0) return;
    const hit = hitAt(this.s, p.screen);
    const onLine = hit?.kind === 'temp-line' || hit?.kind === 'dim-line';
    if (hit && !onLine) return this.onHit(hit, p);
    // Líc vybrané stěny má přednost před čárou kóty, která na něm začíná.
    if (this.faceOfSelected(p, (face, id) => (this.mode = new OffsetMode(this.s, id, face, p, true)))) return;
    if (hit) return this.onHit(hit, p);
    const op = this.openingUnder(p);
    if (op && p.shift) return this.s.selection.toggleOpening(op);
    if (op) {
      if (!this.s.selection.openings.includes(op)) this.s.selection.set([], [], [op]);
      this.mode = new PressOpeningMode(this.s, op, p);
      return;
    }
    const id = this.wallsUnder(p)[0];
    if (id && p.shift) return this.s.selection.toggleWall(id);
    if (id) {
      if (!this.s.selection.walls.includes(id)) this.s.selection.set([id]);
      this.mode = new PressWallMode(this.s, id, p);
      return;
    }
    this.mode = new BoxMode(this.s, p.screen, p.shift);
  }

  private onHit(hit: Hit, p: PointerInfo) {
    const s = this.s;
    if (hit.kind === 'pin') this.mode = new PlacingMode(s, [itemFromTemp(hit.temp)], p.world);
    else if (hit.kind === 'lock')
      s.run('dimension.setLocked', { dimensionId: hit.dim.id, locked: !hit.dim.locked });
    else if (hit.kind === 'len-end') s.lenEnd = s.lenEnd === 'end' ? 'start' : 'end';
    else if (hit.kind === 'grip') this.mode = new NodeMode(s, hit.grip.wallId, hit.grip.end, p, true);
    else if (hit.kind === 'temp-text' || hit.kind === 'temp-line')
      this.mode = new TempDimDragMode(s, hit.temp, hit.kind === 'temp-text', p);
    else if (hit.kind === 'dim-text' || hit.kind === 'dim-line')
      this.mode = new PermDimDragMode(s, hit.dim, hit.kind === 'dim-text', p);
  }

  /** Líc jediné vybrané stěny pod kurzorem (do 7 px). */
  private faceOfSelected(p: PointerInfo, then: (face: 'ref' | 'opp', id: Id) => void): boolean {
    const id = this.s.selection.single;
    if (!id) return false;
    const g = selectableWallGeometry(this.s.model, this.s.view).filter((x) => x.wallId === id);
    const f = pickFace(g, p.world, this.s.viewport.px(7));
    if (!f || (f.face !== 'ref' && f.face !== 'opp')) return false;
    then(f.face, id);
    return true;
  }

  private context(p: PointerInfo) {
    const s = this.s;
    const hit = hitAt(s, p.screen);
    if (hit && (hit.kind === 'dim-text' || hit.kind === 'dim-line' || hit.kind === 'lock')) {
      if (!s.selection.dims.includes(hit.dim.id)) s.selection.set([], [hit.dim.id]);
      return dimMenu(s, hit.dim, p.screen);
    }
    if (hit?.kind === 'grip') return nodeMenu(s, hit.grip.wallId, hit.grip.end, p.screen);
    if (this.faceOfSelected(p, (face, id) => edgeMenu(s, id, face, p, (m) => (this.mode = m)))) return;
    const op = this.openingUnder(p);
    if (op) {
      if (!s.selection.openings.includes(op)) s.selection.set([], [], [op]);
      return openingMenu(s, op, p.screen);
    }
    const id = this.wallsUnder(p)[0];
    if (!id) return;
    if (!s.selection.walls.includes(id)) s.selection.set([id]);
    wallMenu(s, id, p.screen);
  }

  move(p: PointerInfo) {
    if (this.mode?.active) this.mode.move(p);
    else this.hover = this.openingUnder(p) ?? this.wallsUnder(p)[0] ?? null;
  }

  up(p: PointerInfo) {
    if (this.mode?.active) this.mode.up(p);
    this.cleanup();
  }

  private cleanup() {
    if (this.mode && !this.mode.active) this.mode = null;
  }

  key(k: KeyInfo): boolean {
    if (this.mode?.active && this.mode.key?.(k)) return true;
    const s = this.s;
    if (k.key === 'Tab') {
      const p = {
        screen: s.cursor.screen,
        world: s.cursor.world,
        button: 0,
        shift: false,
        ctrl: false,
        alt: false,
      };
      const list = this.wallsUnder(p);
      if (!list.length) return true;
      this.tab = (this.tab + 1) % list.length;
      s.selection.set([list[this.tab] as Id]);
      return true;
    }
    if (k.key === ' ' && s.selection.walls.length) {
      s.run('wall.flipSide', { wallIds: s.selection.walls });
      return true;
    }
    return false;
  }

  escape(): boolean {
    if (this.mode?.active) {
      this.mode.escape();
      this.mode = null;
      return true;
    }
    if (!this.s.selection.empty) {
      this.s.selection.clear();
      return true;
    }
    return false;
  }

  overlay(): Overlay {
    if (this.mode?.active) return this.mode.overlay();
    return this.hover ? { hover: [this.hover] } : {};
  }

  tracker(): readonly TrackerField[] | null {
    return this.mode?.active ? (this.mode.tracker?.() ?? null) : null;
  }
}
