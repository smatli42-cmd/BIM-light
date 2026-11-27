// Myš a klávesy v okně řezu (Revit Spot Elevation, Archicad Level Dimension): nástroj Výšková kóta = klik na
// hranu prvku nebo úroveň podlaží (přichytí se do 8 px), druhý klik určí polohu praporku (pod hranou, když je
// myš pod ní). Jinak výběr výškové kóty klikem (Shift přidá), tažení ji posune, Del smaže, tažení prázdného
// místa posune výkres. Model se mění jen příkazy levelDim.* (stejně jako AI).
import {
  drawLevelSymbol,
  levelDimSymbol,
  levelMarkSize,
  levelTargetAt,
  levelTargets,
  LEVEL_ARM,
  type Id,
  type LevelTarget,
  type Model,
  type Primitive,
  type Vec2,
} from '@bim-light/core';
import type { Viewport } from '../../canvas/viewport.ts';
import { AUX } from '../../render/overlay.ts';
import { drawPrimitive, type RenderContext } from '../../render/primitives.ts';
import { levelDimDefaults } from '../../session/section-defaults.ts';
import type { Session } from '../../session/session.ts';

const SNAP_PX = 8;

interface Drag {
  readonly id: Id;
  readonly start: Vec2;
  readonly at0: number;
  readonly z: number;
  moved: boolean;
}

export class SectionInput {
  private pick: LevelTarget | null = null;
  private hover: LevelTarget | null = null;
  private mouse: Vec2 | null = null;
  private drag: Drag | null = null;
  private pan: Vec2 | null = null;
  private panStart: Vec2 | null = null;
  private cache: { model: Model; targets: LevelTarget[] } | null = null;

  constructor(
    private readonly s: Session,
    private readonly sectionId: Id,
    private readonly v: Viewport,
  ) {}

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
    if (button !== 0) return;
    if (this.tool) return this.toolClick(p);
    const hit = this.dimAt(p);
    if (!hit) {
      this.pan = this.panStart = screen;
      return;
    }
    if (shift) this.s.selection.toggleLevelDim(hit.id);
    else if (!this.s.selection.levelDims.includes(hit.id))
      this.s.selection.set([], [], [], [], [], [], [], [hit.id]);
    this.drag = { id: hit.id, start: p, at0: hit.at, z: hit.z, moved: false };
    this.s.changed();
  }

  private toolClick(p: Vec2) {
    if (!this.pick) {
      this.pick = levelTargetAt(this.targets(), p.x, p.y, this.v.px(SNAP_PX));
      this.hover = null;
      return;
    }
    const r = this.s.run('levelDim.create', {
      sectionId: this.sectionId,
      ref: this.pick.ref,
      at: p.x,
      below: p.y < this.pick.z,
      absolute: levelDimDefaults(this.s).absolute,
    });
    if (r.ok) this.pick = null;
  }

  /** true = je potřeba překreslit. */
  move(screen: Vec2): boolean {
    const p = this.v.toWorld(screen);
    this.mouse = p;
    if (this.pan) {
      this.v.pan(screen.x - this.pan.x, screen.y - this.pan.y);
      this.pan = screen;
      return true;
    }
    if (this.drag) {
      this.drag.moved ||= Math.abs(p.x - this.drag.start.x) > this.v.px(3);
      return true;
    }
    if (this.tool && !this.pick) this.hover = levelTargetAt(this.targets(), p.x, p.y, this.v.px(SNAP_PX));
    return this.tool;
  }

  up(screen: Vec2) {
    const d = this.drag;
    const start = this.panStart;
    this.drag = this.pan = this.panStart = null;
    if (d?.moved && this.mouse) {
      const at = d.at0 + this.mouse.x - d.start.x;
      this.s.run('levelDim.move', { levelDimId: d.id, at, below: this.mouse.y < d.z });
    }
    // Klik do prázdna (bez posunu výkresu) výběr kót zruší, jako v půdorysu.
    const click = start && Math.hypot(screen.x - start.x, screen.y - start.y) < 3;
    if (click && this.s.selection.levelDims.length) {
      this.s.selection.set([]);
      this.s.changed();
    }
  }

  /** Esc a Del v aktivním okně řezu; true = zpracováno. */
  key(key: string): boolean {
    if (key === 'Escape') {
      if (this.pick) this.pick = null;
      else if (this.tool) this.s.setTool('select');
      else if (this.s.selection.levelDims.length) this.s.selection.set([]);
      else return false;
      this.s.changed();
      return true;
    }
    if ((key === 'Delete' || key === 'Backspace') && this.s.selection.levelDims.length) {
      this.s.run('selection.delete', { levelDimIds: this.s.selection.levelDims });
      return true;
    }
    return false;
  }

  /** Náhled: zvýrazněná hrana pod kurzorem, praporek na myši, tažená kóta. */
  overlay(r: RenderContext) {
    const sec = this.s.model.sections[this.sectionId];
    const m = this.mouse;
    if (!sec || !m) return;
    const g = { ...this.s.model.display.baseGraphics, projectionPen: 1 };
    const ghost = (x: number, z: number, below: boolean) =>
      drawLevelSymbol(
        { x, z, text: '', below, filled: false },
        this.s.model.display.paperSizes,
        sec.scale,
        g,
        {
          role: 'náhled',
        },
      );
    let prims: Primitive[] = [];
    const t = this.tool ? (this.pick ?? this.hover) : null;
    if (t) {
      const u0 = Number.isFinite(t.u0) ? t.u0 : m.x - this.v.px(200);
      const u1 = Number.isFinite(t.u1) ? t.u1 : m.x + this.v.px(200);
      const line: Primitive = {
        kind: 'line',
        points: [
          { x: u0, y: t.z },
          { x: u1, y: t.z },
        ],
        closed: false,
        stroke: { pen: 1, color: AUX, lineType: 'dashed' },
        source: { role: 'náhled' },
      };
      prims = [line, ...(this.pick ? ghost(m.x, t.z, m.y < t.z) : [])];
    }
    if (this.drag?.moved)
      prims = ghost(this.drag.at0 + m.x - this.drag.start.x, this.drag.z, m.y < this.drag.z);
    for (const p of prims) drawPrimitive(r, p, AUX);
  }
}
