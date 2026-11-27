// Výběr prvků v okně řezu (pokyn uživatele 2026-11-27; pravidla-interakce → Výběr, Revit / Archicad): klik
// vybere prvek pod kurzorem (stěna, deska, otvor – řezané i za rovinou), Shift přidá / ubere, klik do prázdna
// výběr zruší, tažení zleva doprava = rámeček jen celých prvků, zprava doleva i protnutých, Tab střídá
// překrývající se prvky, Ctrl+A vybere vše v řezu, pravé tlačítko nabídku. Výběr je společný se všemi okny
// (s.selection) – vybraná stěna je vybraná i v půdorysu a ve 3D. Jádro: section.pick / section.pickBox.
import {
  sectionPickAt,
  sectionPickBox,
  sectionShapes,
  type Id,
  type Primitive,
  type Vec2,
} from '@bim-light/core';
import type { Viewport } from '../../canvas/viewport.ts';
import { openingMenu, wallMenu } from '../../interaction/tools/select/menus.ts';
import { AUX } from '../../render/overlay.ts';
import { drawPrimitive, type RenderContext } from '../../render/primitives.ts';
import type { Session } from '../../session/session.ts';

const PICK_PX = 4;
const DRAG_PX = 4;

export class SectionSelect {
  private start: { screen: Vec2; shift: boolean } | null = null;
  private end: Vec2 | null = null;
  private cycle: { ids: Id[]; i: number } | null = null;
  /** Prvek pod kurzorem (předzvýraznění a karta prvku). */
  hover: Id | null = null;

  constructor(
    private readonly s: Session,
    private readonly sectionId: Id,
    private readonly v: Viewport,
  ) {}

  private get section() {
    return this.s.model.sections[this.sectionId];
  }

  /** Prvky pod bodem podle filtru výběru (stěny a jejich otvory, desky). */
  pickAt(p: Vec2): Id[] {
    const sec = this.section;
    if (!sec) return [];
    return sectionPickAt(this.s.model, sec, p, this.v.px(PICK_PX)).filter((id) => this.allowed(id));
  }

  private allowed(id: Id): boolean {
    const el = this.s.model.elements[id];
    if (el?.category === 'slab') return this.s.filter.slabs;
    return this.s.filter.walls;
  }

  /** Nastaví (nebo přidá) prvky do společného výběru podle druhu. */
  private apply(ids: readonly Id[], add: boolean) {
    const sel = this.s.selection;
    const of = (cat: string) => ids.filter((id) => this.s.model.elements[id]?.category === cat);
    const openings = ids.filter((id) => this.s.model.openings[id]);
    if (!add) return sel.set(of('wall'), [], openings, of('slab'));
    sel.set(
      [...new Set([...sel.walls, ...of('wall')])],
      sel.dims,
      [...new Set([...sel.openings, ...openings])],
      [...new Set([...sel.slabs, ...of('slab')])],
      sel.slabOpenings,
      sel.rooms,
      sel.sections,
      sel.levelDims,
    );
  }

  private toggle(id: Id) {
    const sel = this.s.selection;
    if (this.s.model.openings[id]) sel.toggleOpening(id);
    else if (this.s.model.elements[id]?.category === 'slab') sel.toggleSlab(id);
    else sel.toggleWall(id);
  }

  /** Stisk levého tlačítka (nic jiného – kóty – pod kurzorem nebylo). */
  press(screen: Vec2, p: Vec2, shift: boolean) {
    const ids = this.pickAt(p);
    const id = ids[0];
    if (id) {
      this.cycle = { ids, i: 0 };
      if (shift) this.toggle(id);
      else if (!this.s.selection.has(id)) this.apply([id], false);
      this.s.changed();
      return;
    }
    this.start = { screen, shift };
    this.end = screen;
  }

  /** true = je potřeba překreslit. */
  move(screen: Vec2, p: Vec2): boolean {
    if (this.start) {
      this.end = screen;
      return true;
    }
    const h = this.pickAt(p)[0] ?? null;
    const changed = h !== this.hover;
    this.hover = h;
    return changed;
  }

  get dragging(): boolean {
    return !!this.start;
  }

  release() {
    const st = this.start;
    const end = this.end;
    this.start = this.end = null;
    if (!st || !end) return;
    const sec = this.section;
    if (Math.hypot(end.x - st.screen.x, end.y - st.screen.y) < DRAG_PX) {
      if (!st.shift) this.s.selection.set([]);
    } else if (sec) {
      const crossing = end.x < st.screen.x;
      const ids = sectionPickBox(this.s.model, sec, this.v.toWorld(st.screen), this.v.toWorld(end), crossing);
      this.apply(
        ids.filter((id) => this.allowed(id)),
        st.shift,
      );
    }
    this.s.changed();
  }

  /** Tab: další z překrývajících se prvků pod posledním klikem. */
  tab(): boolean {
    const c = this.cycle;
    if (!c || c.ids.length < 2) return false;
    c.i = (c.i + 1) % c.ids.length;
    this.apply([c.ids[c.i] as Id], false);
    this.s.changed();
    return true;
  }

  /** Ctrl+A: všechny prvky řezu (podle filtru). */
  selectAll() {
    const sec = this.section;
    if (!sec) return;
    const ids = [...new Set(sectionShapes(this.s.model, sec).map((x) => x.id))].filter((id) =>
      this.allowed(id),
    );
    this.apply(ids, false);
    this.s.changed();
  }

  /** Pravé tlačítko: nabídka stěny / otvoru jako v půdorysu (vybere prvek, když vybraný není). */
  context(screen: Vec2, p: Vec2) {
    const id = this.pickAt(p)[0];
    if (!id) return;
    if (!this.s.selection.has(id)) this.apply([id], false);
    if (this.s.model.openings[id]) openingMenu(this.s, id, screen);
    else if (this.s.model.elements[id]?.category === 'wall') wallMenu(this.s, id, screen);
    this.s.changed();
  }

  /** Rámeček výběru (plný zleva, čárkovaný zprava jako v půdorysu). */
  overlay(r: RenderContext) {
    const st = this.start;
    const end = this.end;
    if (!st || !end || Math.hypot(end.x - st.screen.x, end.y - st.screen.y) < DRAG_PX) return;
    const a = this.v.toWorld(st.screen);
    const b = this.v.toWorld(end);
    const box: Primitive = {
      kind: 'line',
      points: [a, { x: b.x, y: a.y }, b, { x: a.x, y: b.y }],
      closed: true,
      stroke: { pen: 1, color: AUX, lineType: end.x < st.screen.x ? 'dashed' : 'solid' },
      source: { role: 'rámeček' },
    };
    drawPrimitive(r, box, AUX);
  }
}
