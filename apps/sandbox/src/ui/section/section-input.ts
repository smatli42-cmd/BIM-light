// Myš a klávesy v okně řezu (Revit Spot Elevation, Archicad Level Dimension): nástroj Výšková kóta = jeden klik
// na hranu prvku nebo úroveň podlaží (do 12 px), nebo do plochy prvku (jeho bližší hrana) vloží praporek hrotem
// na hranu v místě kliku; jinak hláška. Jinak výběr výškové kóty klikem (Shift přidá), tažení ji posune (i pod
// hranu), Del smaže, tažení prázdného místa posune výkres. Model se mění jen příkazy levelDim.* (stejně jako AI).
import {
  levelDimSymbol,
  levelMarkSize,
  levelTargetPick,
  levelTargets,
  LEVEL_ARM,
  type Id,
  type LevelTarget,
  type Model,
  type Vec2,
} from '@bim-light/core';
import type { Viewport } from '../../canvas/viewport.ts';
import { AUX } from '../../render/overlay.ts';
import { drawPrimitive, type RenderContext } from '../../render/primitives.ts';
import { levelDimDefaults } from '../../session/section-defaults.ts';
import { SectionDimInput } from './section-dim-input.ts';
import { levelPreview } from './section-level-preview.ts';
import { SectionGrips } from './section-grips.ts';
import { SectionSelect } from './section-select.ts';
import { SectionTagInput } from './section-tag-input.ts';
import type { Session } from '../../session/session.ts';

/** Přichycení k hraně / úrovni (px); klik do plochy prvku vezme jeho bližší hranu. */
const SNAP_PX = 12;

interface Drag {
  readonly id: Id;
  readonly start: Vec2;
  readonly at0: number;
  readonly z: number;
  moved: boolean;
}

export class SectionInput {
  private hover: LevelTarget | null = null;
  private mouse: Vec2 | null = null;
  private drag: Drag | null = null;
  private pan: Vec2 | null = null;
  private cache: { model: Model; targets: LevelTarget[] } | null = null;
  /** Nástroj Kóta v řezu a tažení vybrané kóty (section-dim-input.ts). */
  private readonly dims: SectionDimInput;
  /** Nástroj Popis skladby a tažení textu popisu (section-tag-input.ts). */
  private readonly tags: SectionTagInput;
  /** Výběr stěn, desek a otvorů (section-select.ts). */
  readonly sel: SectionSelect;
  /** Úchopy vybraných prvků (section-grips.ts). */
  readonly grips: SectionGrips;
  private dimDrag: { id: Id; vertical: boolean; offset0: number; start: Vec2 } | null = null;

  constructor(
    private readonly s: Session,
    private readonly sectionId: Id,
    private readonly v: Viewport,
  ) {
    this.dims = new SectionDimInput(s, sectionId, v);
    this.tags = new SectionTagInput(s, sectionId, v);
    this.sel = new SectionSelect(s, sectionId, v);
    this.grips = new SectionGrips(s, sectionId, v);
  }

  private get tool() {
    return this.s.tool.id === 'levelDim';
  }

  private targets(): LevelTarget[] {
    if (this.cache?.model !== this.s.model)
      this.cache = { model: this.s.model, targets: levelTargets(this.s.model, this.sectionId) };
    return this.cache.targets;
  }

  /** Výšková kóta pod kurzorem (praporek a text kolem bodu na úrovni). */
  private dimAt(p: Vec2): { id: Id; z: number; at: number } | null {
    const sec = this.s.model.sections[this.sectionId];
    if (!sec) return null;
    const h = levelMarkSize(this.s.model.display.paperSizes) * sec.scale;
    for (const d of Object.values(this.s.model.levelDims)) {
      if (d.sectionId !== sec.id) continue;
      const sym = levelDimSymbol(this.s.model, sec, d);
      if (!sym) continue;
      const z1 = sym.z + (d.below ? -1 : 1) * h * 3;
      const inZ = p.y >= Math.min(sym.z, z1) - this.v.px(3) && p.y <= Math.max(sym.z, z1) + this.v.px(3);
      if (inZ && Math.abs(p.x - d.at) <= h * LEVEL_ARM + this.v.px(3))
        return { id: d.id, z: sym.z, at: d.at };
    }
    return null;
  }

  down(screen: Vec2, button: number, shift: boolean) {
    const p = this.v.toWorld(screen);
    if (button === 1) return void (this.pan = screen);
    if (button === 2 && !this.tool && !this.dims.active && !this.tags.active)
      return this.sel.context(screen, p);
    if (button !== 0) return;
    if (this.tool) return this.toolClick(p);
    if (this.dims.active) return this.dims.click(p);
    if (this.tags.active) return this.tags.click(p);
    if (this.grips.down()) return;
    const grip = this.grips.hit(p);
    if (grip) return this.grips.press(grip, screen);
    const hit = this.dimAt(p);
    if (!hit) return this.pressSectionDim(p, screen, shift);
    this.select(hit.id, shift);
    this.drag = { id: hit.id, start: p, at0: hit.at, z: hit.z, moved: false };
    this.s.changed();
  }

  private select(id: Id, shift: boolean) {
    if (shift) this.s.selection.toggleLevelDim(id);
    else if (!this.s.selection.levelDims.includes(id)) this.s.selection.set([], [], [], [], [], [], [], [id]);
  }

  /** Stisk na délkové kótě v řezu: výběr a tažení kótovací čáry; jinde posun výkresu. */
  private pressSectionDim(p: Vec2, screen: Vec2, shift: boolean) {
    const hit = this.dims.hit(p);
    // Jinde výběr prvku nebo rámeček (posun výkresu prostředním tlačítkem, jako v půdorysu).
    if (!hit) return void (this.tags.press(p, shift) || this.sel.press(screen, p, shift));
    this.select(hit.id, shift);
    this.dimDrag = { id: hit.id, vertical: hit.vertical, offset0: hit.offset, start: p };
    this.s.changed();
  }

  /** Jeden klik (pokyn uživatele): praporek hrotem na hranu / úroveň pod kurzorem, vodorovně v místě kliku. */
  private toolClick(p: Vec2) {
    const t = levelTargetPick(this.targets(), p.x, p.y, this.v.px(SNAP_PX));
    if (!t)
      return this.s.toast(
        'Klikni na hranu stěny nebo desky, do jejich plochy, nebo na úroveň podlaží.',
        'bad',
      );
    this.s.run('levelDim.create', {
      sectionId: this.sectionId,
      ref: t.ref,
      at: p.x,
      absolute: levelDimDefaults(this.s).absolute,
    });
  }

  /** true = je potřeba překreslit. */
  move(screen: Vec2, alt = false): boolean {
    const p = this.v.toWorld(screen);
    this.mouse = p;
    if (this.grips.active) return this.grips.move(screen, p, alt);
    if (this.pan) {
      this.v.pan(screen.x - this.pan.x, screen.y - this.pan.y);
      this.pan = screen;
      return true;
    }
    this.tags.move(p);
    if (this.drag || this.tags.dragging || this.tags.active) {
      if (!this.drag) return true;
      this.drag.moved ||= Math.abs(p.x - this.drag.start.x) > this.v.px(3);
      return true;
    }
    if (this.dims.active) {
      this.dims.move(p);
      return true;
    }
    if (this.tool) this.hover = levelTargetPick(this.targets(), p.x, p.y, this.v.px(SNAP_PX));
    return this.tool || this.sel.move(screen, p);
  }

  up() {
    const d = this.drag;
    this.drag = this.pan = null;
    this.grips.up();
    this.dropSectionDim();
    this.tags.release();
    if (this.sel.dragging) this.sel.release();
    if (d?.moved && this.mouse) {
      const at = d.at0 + this.mouse.x - d.start.x;
      this.s.run('levelDim.move', { levelDimId: d.id, at, below: this.mouse.y < d.z });
    }
  }

  /** Konec tažení kóty v řezu: posun kótovací čáry (svislá kóta po u, vodorovná po z). */
  private dropSectionDim() {
    const d = this.dimDrag;
    this.dimDrag = null;
    const m = this.mouse;
    if (!d || !m) return;
    const delta = d.vertical ? m.x - d.start.x : m.y - d.start.y;
    if (Math.abs(delta) > this.v.px(3))
      this.s.run('sectionDim.update', { dimId: d.id, offset: d.offset0 + delta });
  }

  /** Esc a Del v aktivním okně řezu; true = zpracováno. */
  key(key: string, ctrl = false): boolean {
    if (this.grips.key(key)) return true;
    // Undo / Redo i v okně řezu (jedno Undo vrátí celé tažení úchopu).
    if (ctrl && /^[zy]$/i.test(key))
      return (
        key.toLowerCase() === 'z' ? this.s.editor.undo() : this.s.editor.redo(),
        this.s.changed(),
        true
      );
    if (key === 'Tab' && !this.tool && !this.dims.active && !this.tags.active) return this.sel.tab();
    if (ctrl && (key === 'a' || key === 'A')) return (this.sel.selectAll(), true);
    if (key === 'Escape') {
      if ((this.dims.active && this.dims.escape()) || this.tags.escape()) return true;
      else if (this.tool || this.dims.active || this.tags.active) this.s.setTool('select');
      else if (!this.s.selection.empty) this.s.selection.set([]);
      else return false;
      this.s.changed();
      return true;
    }
    if ((key === 'Delete' || key === 'Backspace') && !this.s.selection.empty) {
      this.s.run('selection.delete', this.s.selection.deleteParams());
      return true;
    }
    return false;
  }

  /** Náhled: zvýrazněná hrana pod kurzorem, praporek na myši, tažená kóta. */
  overlay(r: RenderContext) {
    const sec = this.s.model.sections[this.sectionId];
    const m = this.mouse;
    if (!sec || !m) return;
    const prims = levelPreview(this.s.model, sec, this.v, m, this.tool ? this.hover : null, this.drag);
    for (const p of prims) drawPrimitive(r, p, AUX);
    if (this.dims.active) this.dims.overlay(r);
    this.tags.overlay(r);
    this.sel.overlay(r);
    this.grips.overlay(r);
  }
}
