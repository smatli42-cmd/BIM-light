// Výběr a úpravy značky řezu nástrojem Výběr (Revit / Archicad): klik na čáru řezu vybere (Shift přidá /
// ubere), tažení čáry posune celý řez, úchyty na koncích vybraného řezu prodlouží / přesunou konec,
// dvojklik otevře okno řezu. Vše jde příkazy section.move / section.update (stejně jako AI).
import { layerState, roundTo, sectionOnStorey, sub, type Id, type Section, type Vec2 } from '@bim-light/core';
import { openSection } from '../../../session/section-windows.ts';
import type { Session } from '../../../session/session.ts';
import { DRAG_PX, type Mode } from '../../mode.ts';
import { segDist } from '../../screen.ts';
import type { Overlay, PointerInfo } from '../../types.ts';

const PICK_PX = 5;
const GRIP_PX = 8;

/** Řezy, jejichž značka je v půdorysu aktivního okna vidět. */
function shownSections(s: Session): Section[] {
  return Object.values(s.model.sections).filter(
    (x) =>
      x.kind === 'section' &&
      sectionOnStorey(s.model, x, s.view.storeyId) &&
      layerState(s.model.display, s.view, x.annotationLayerId).visible,
  );
}

/** Řez, jehož čára je pod kurzorem. */
export function sectionUnder(s: Session, p: PointerInfo): Id | null {
  for (const x of shownSections(s)) {
    const pts = x.points.map((q) => s.viewport.toScreen(q));
    if (pts.slice(1).some((b, i) => segDist(p.screen, pts[i] as Vec2, b) <= PICK_PX)) return x.id;
  }
  return null;
}

/** Konec jediného vybraného řezu pod kurzorem (úchyt). */
function gripUnder(s: Session, p: PointerInfo): { id: Id; end: 'start' | 'end' } | null {
  const id =
    s.selection.sections.length === 1 && s.selection.walls.length === 0 ? s.selection.sections[0] : null;
  const sec = id ? s.model.sections[id] : undefined;
  if (!id || !sec) return null;
  const ends = [
    ['start', sec.points[0]],
    ['end', sec.points[sec.points.length - 1]],
  ] as const;
  for (const [end, q] of ends) {
    if (!q) continue;
    const at = s.viewport.toScreen(q);
    if (Math.hypot(at.x - p.screen.x, at.y - p.screen.y) <= GRIP_PX) return { id, end };
  }
  return null;
}

/** Tažení čáry (posun) nebo úchytu (konec); klik bez tažení jen vybere. */
class SectionDragMode implements Mode {
  active = true;
  private dragging = false;
  private vector: Vec2 = { x: 0, y: 0 };
  readonly hint: string;

  constructor(
    private readonly s: Session,
    private readonly id: Id,
    private readonly start: PointerInfo,
    private readonly end: 'start' | 'end' | null,
  ) {
    this.hint = end ? 'Táhni konec čáry řezu.' : 'Táhni čáru řezu; dvojklik otevře řez.';
  }

  private command(): [string, Record<string, unknown>] | null {
    const sec = this.s.model.sections[this.id];
    if (!sec || !this.dragging) return null;
    if (!this.end) return ['section.move', { sectionId: this.id, delta: this.vector }];
    const q = this.end === 'start' ? sec.points[0] : sec.points[sec.points.length - 1];
    if (!q) return null;
    return [
      'section.update',
      { sectionId: this.id, [this.end]: { x: q.x + this.vector.x, y: q.y + this.vector.y } },
    ];
  }

  move(p: PointerInfo) {
    const far = Math.hypot(p.screen.x - this.start.screen.x, p.screen.y - this.start.screen.y) > DRAG_PX;
    if (far) this.dragging = true;
    if (!this.dragging) return;
    const v = sub(p.world, this.start.world);
    this.vector = p.alt ? v : { x: roundTo(v.x), y: roundTo(v.y) };
  }

  up() {
    this.active = false;
    const c = this.command();
    if (c && Math.hypot(this.vector.x, this.vector.y) > 0.5) this.s.run(c[0], c[1]);
  }

  down() {
    return false;
  }

  escape() {
    this.active = false;
  }

  overlay(): Overlay {
    const c = this.command();
    return c ? { previewModel: this.s.editor.preview(c[0], c[1]) } : {};
  }
}

/** Neaktivní režim: stisk zpracovaný bez tažení (Shift, dvojklik). */
const DONE: Mode = {
  active: false,
  move() {},
  up() {},
  down: () => false,
  escape() {},
  overlay: () => ({}),
};

/** Stisk na řezu nebo jeho úchytu; null = pod kurzorem žádný řez. */
export function pressSection(s: Session, p: PointerInfo): Mode | null {
  if (s.screen.isolate) return null;
  const grip = gripUnder(s, p);
  if (grip) return new SectionDragMode(s, grip.id, p, grip.end);
  const id = sectionUnder(s, p);
  if (!id) return null;
  if (p.shift) {
    s.selection.toggleSection(id);
    return DONE;
  }
  if (!s.selection.sections.includes(id)) s.selection.set([], [], [], [], [], [], [id]);
  return new SectionDragMode(s, id, p, null);
}

/** Zvýraznění vybraných řezů (čára barvou výběru) a úchyty na koncích. */
export function withSectionMarks(s: Session, o: Overlay): Overlay {
  const secs = s.selection.sections.map((id) => s.model.sections[id]).filter((x): x is Section => !!x);
  if (!secs.length) return o;
  const lines = secs.flatMap((x) =>
    x.points.slice(1).map((b, i) => [x.points[i] as Vec2, b] as [Vec2, Vec2]),
  );
  const ends = secs.flatMap((x) => [x.points[0] as Vec2, x.points[x.points.length - 1] as Vec2]);
  return { ...o, lines: [...(o.lines ?? []), ...lines], markers: [...(o.markers ?? []), ...ends] };
}

/** Dvojklik na čáru řezu: řez se otevře v okně místo půdorysu. */
export function openSectionAt(s: Session, p: PointerInfo) {
  const id = s.screen.isolate ? null : sectionUnder(s, p);
  if (id) openSection(s, id);
}
