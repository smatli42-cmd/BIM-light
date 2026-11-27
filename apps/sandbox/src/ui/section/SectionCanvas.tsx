// Plátno okna řezu / pohledu: kresba z jádra (drawSection) přes stejné vykreslení primitiv jako půdorys
// (pera podle měřítka řezu, podklad podle motivu). Kolečko přiblíží, tažení posune; při otevření se kresba
// vejde do okna. Překreslí se při každé změně modelu (řez se počítá z modelu, nic se neukládá).
import { drawSection, type Drawing, type Vec2 } from '@bim-light/core';
import { useEffect, useRef } from 'preact/hooks';
import { Viewport } from '../../canvas/viewport.ts';
import { PAPER_BG } from '../../render/paper.ts';
import { drawDrawing, type RenderContext } from '../../render/primitives.ts';
import type { Session } from '../../session/session.ts';

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

/** Kolečko přiblíží, tažení posune; vrací úklid. */
function panZoom(canvas: HTMLCanvasElement, v: Viewport, schedule: () => void): () => void {
  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    const r = canvas.getBoundingClientRect();
    v.zoomAt({ x: e.clientX - r.left, y: e.clientY - r.top }, e.deltaY < 0 ? 1.15 : 1 / 1.15);
    schedule();
  };
  let drag: Vec2 | null = null;
  const onDown = (e: MouseEvent) => (drag = { x: e.clientX, y: e.clientY });
  const onMove = (e: MouseEvent) => {
    if (!drag) return;
    v.pan(e.clientX - drag.x, e.clientY - drag.y);
    drag = { x: e.clientX, y: e.clientY };
    schedule();
  };
  const onUp = () => (drag = null);
  canvas.addEventListener('wheel', onWheel, { passive: false });
  canvas.addEventListener('mousedown', onDown);
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp);
  return () => {
    canvas.removeEventListener('wheel', onWheel);
    canvas.removeEventListener('mousedown', onDown);
    window.removeEventListener('mousemove', onMove);
    window.removeEventListener('mouseup', onUp);
  };
}

/** Vykreslí řez do plátna; při prvním kreslení přiblíží na celou kresbu. */
function painter(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  s: Session,
  id: string,
  v: Viewport,
) {
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
    const ratio = window.devicePixelRatio || 1;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.fillStyle = PAPER_BG[s.paper];
    ctx.fillRect(0, 0, v.width, v.height);
    const r: RenderContext = { ctx, v, pens: s.model.display.penTable, scale: d.scale, paper: s.paper };
    drawDrawing(r, d);
  };
}

/** Překreslování, velikost plátna a ovládání; vrací úklid. */
function attach(canvas: HTMLCanvasElement, s: Session, sectionId: string): () => void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return () => undefined;
  const v = new Viewport();
  const paint = painter(canvas, ctx, s, sectionId, v);
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
  const offPointer = panZoom(canvas, v, schedule);
  return () => {
    cancelAnimationFrame(frame);
    observer.disconnect();
    off();
    offPointer();
  };
}

export function SectionCanvas({ s, sectionId }: { s: Session; sectionId: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => (ref.current ? attach(ref.current, s, sectionId) : undefined), [s, sectionId]);
  return <canvas ref={ref} class="section-canvas" data-testid="section-canvas" />;
}
