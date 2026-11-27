// Plátno řezu / pohledu v pracovním okně: kresba z jádra (drawSection) přes stejné vykreslení primitiv jako
// půdorys (pera podle měřítka řezu, podklad podle motivu); vybrané výškové kóty barvou výběru, náhled nástroje
// Výšková kóta (section-input.ts). Kolečko přiblíží; při otevření se kresba vejde do okna. Překreslí se při
// každé změně modelu (řez se počítá z modelu, nic se neukládá).
import { drawSection, type Drawing, type Vec2 } from '@bim-light/core';
import { useEffect, useRef } from 'preact/hooks';
import { Viewport } from '../../canvas/viewport.ts';
import { AUX_LIGHT, SELECT } from '../../render/overlay.ts';
import { PAPER_BG } from '../../render/paper.ts';
import { drawDrawing, drawPrimitive, type RenderContext } from '../../render/primitives.ts';
import type { Session } from '../../session/session.ts';
import { activate } from '../../session/windows.ts';
import { SectionInput } from './section-input.ts';
import { cardTimer, type CardState } from './section-card.ts';

function pointsOf(d: Drawing): Vec2[] {
  return d.primitives.flatMap((p) =>
    p.kind === 'line' ? [...p.points] : p.kind === 'text' ? [p.at] : [...p.polygon],
  );
}

/** Přiblíží výřez na celou kresbu. */
function fit(v: Viewport, d: Drawing) {
  const pts = pointsOf(d);
  if (!pts.length) return;
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  v.zoomToBox(Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys), 40);
}

interface Ctx {
  readonly canvas: HTMLCanvasElement;
  readonly s: Session;
  readonly v: Viewport;
  readonly input: SectionInput;
  readonly schedule: () => void;
  readonly index: number;
  /** Karta prvku po podržení myši (section-card.ts). */
  readonly onCard: (c: CardState) => void;
}

/** Myš, kolečko a klávesy; vrací úklid. */
function events(c: Ctx): () => void {
  const { canvas, v, input, schedule } = c;
  const at = (e: MouseEvent) => {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    v.zoomAt(at(e), e.deltaY < 0 ? 1.15 : 1 / 1.15);
    schedule();
  };
  const onDown = (e: MouseEvent) => (input.down(at(e), e.button, e.shiftKey), schedule());
  const card = cardTimer(c.s, () => input.sel.hover, c.onCard);
  const onMove = (e: MouseEvent) => {
    const p = at(e);
    const inside = p.x >= 0 && p.y >= 0 && p.x <= canvas.clientWidth && p.y <= canvas.clientHeight;
    if (inside) card.move(p, e.buttons);
    else card.hide();
    if (input.move(p)) schedule();
  };
  const onUp = () => (input.up(), schedule());
  const onKey = (e: KeyboardEvent) => {
    const t = e.target;
    if (c.s.active !== c.index || t instanceof HTMLInputElement || t instanceof HTMLSelectElement) return;
    if (!input.key(e.key, e.ctrlKey || e.metaKey)) return;
    e.preventDefault();
    schedule();
  };
  canvas.addEventListener('wheel', onWheel, { passive: false });
  canvas.addEventListener('mousedown', onDown);
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp);
  window.addEventListener('keydown', onKey);
  return () => {
    canvas.removeEventListener('wheel', onWheel);
    canvas.removeEventListener('mousedown', onDown);
    window.removeEventListener('mousemove', onMove);
    window.removeEventListener('mouseup', onUp);
    window.removeEventListener('keydown', onKey);
  };
}

/** Vykreslí řez do plátna; při prvním kreslení přiblíží na celou kresbu. */
function painter(c: Omit<Ctx, 'schedule'>, ctx: CanvasRenderingContext2D, id: string) {
  const { canvas, s, v } = c;
  let fitted = false;
  return () => {
    if (!s.model.sections[id]) return;
    const d = drawSection(s.model, id);
    if (!fitted) {
      fit(v, d);
      fitted = true;
    }
    canvas.dataset['primitives'] = String(d.primitives.length);
    canvas.dataset['hatches'] = String(d.primitives.filter((p) => p.kind === 'hatch').length);
    // Převod mm výkresu → px plátna pro prohlížečové testy.
    canvas.dataset['view'] = JSON.stringify({ s: v.s, ox: v.ox, oy: v.oy });
    const ratio = window.devicePixelRatio || 1;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.fillStyle = PAPER_BG[s.paper];
    ctx.fillRect(0, 0, v.width, v.height);
    const r: RenderContext = { ctx, v, pens: s.model.display.penTable, scale: d.scale, paper: s.paper };
    drawDrawing(r, d);
    // Výběr a předzvýraznění jako v půdorysu: čáry vybraných prvků barvou výběru, prvek pod kurzorem světle.
    const hover = c.input.sel.hover;
    for (const p of d.primitives) {
      const id = p.source.dimensionId ?? p.source.elementId;
      if (p.kind !== 'line' && p.kind !== 'text') continue;
      if (id && s.selection.has(id)) drawPrimitive(r, p, SELECT);
      else if (id && id === hover) drawPrimitive(r, p, AUX_LIGHT);
    }
    c.input.overlay(r);
  };
}

/** Překreslování, velikost plátna a ovládání; vrací úklid. */
function attach(
  canvas: HTMLCanvasElement,
  s: Session,
  sectionId: string,
  index: number,
  onCard: (c: CardState) => void,
): () => void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return () => undefined;
  const v = new Viewport();
  const input = new SectionInput(s, sectionId, v);
  const paint = painter({ canvas, s, v, input, index, onCard }, ctx, sectionId);
  let frame = 0;
  const schedule = () => {
    if (!frame)
      frame = requestAnimationFrame(() => {
        frame = 0;
        paint();
      });
  };
  const resize = () => {
    const ratio = window.devicePixelRatio || 1;
    const { width, height } = canvas.getBoundingClientRect();
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    v.resize(width, height);
    schedule();
  };
  resize();
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  const off = s.subscribe(schedule);
  const offEvents = events({ canvas, s, v, input, schedule, index, onCard });
  return () => {
    cancelAnimationFrame(frame);
    observer.disconnect();
    off();
    offEvents();
  };
}

/** Plátno řezu v pracovním okně `index`; klik nebo kolečko udělá okno aktivním. */
export function SectionCanvas(p: {
  s: Session;
  sectionId: string;
  index: number;
  onCard: (c: CardState) => void;
}) {
  const { s, sectionId, index } = p;
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(
    () => (ref.current ? attach(ref.current, s, sectionId, index, p.onCard) : undefined),
    [s, sectionId, index],
  );
  return (
    <canvas
      ref={ref}
      class="drawing section-canvas"
      data-testid={index === s.active ? 'section-canvas' : 'section-canvas-passive'}
      onMouseDown={() => activate(s, index)}
      onWheel={() => activate(s, index)}
      onContextMenu={(e) => e.preventDefault()}
    />
  );
}
