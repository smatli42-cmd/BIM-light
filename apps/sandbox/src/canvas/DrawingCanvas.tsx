import { useEffect, useRef } from 'preact/hooks';
import type { Controller, RawPointer } from '../interaction/controller.ts';
import { render, renderPassive } from '../render/renderer.ts';
import { activate } from '../session/windows.ts';
import type { Session } from '../session/session.ts';

const raw = (e: MouseEvent, el: HTMLElement): RawPointer => {
  const r = el.getBoundingClientRect();
  return {
    x: e.clientX - r.left,
    y: e.clientY - r.top,
    button: e.button,
    shift: e.shiftKey,
    ctrl: e.ctrlKey || e.metaKey,
    alt: e.altKey,
  };
};

const isField = (t: EventTarget | null) =>
  t instanceof HTMLInputElement || t instanceof HTMLSelectElement || t instanceof HTMLTextAreaElement;

/** Překreslování, velikost plátna a klávesy; vrací úklid. */
function attachCanvas(
  canvas: HTMLCanvasElement,
  session: Session,
  controller: Controller,
  index: number,
): () => void {
  const isActive = () => session.active === index;
  const ctx = canvas.getContext('2d');
  if (!ctx) return () => undefined;
  let frame = 0;
  const paint = () => {
    frame = 0;
    const ratio = window.devicePixelRatio || 1;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    if (isActive()) render(ctx, session);
    else renderPassive(ctx, session, index);
  };
  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(paint);
  };
  const resize = () => {
    const ratio = window.devicePixelRatio || 1;
    const { width, height } = canvas.getBoundingClientRect();
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    session.windows[index]?.viewport.resize(width, height);
    schedule();
  };
  resize();
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  const off = session.subscribe(schedule);
  const onKey = (e: KeyboardEvent) => {
    if (isField(e.target) || !isActive()) return;
    const k = { key: e.key, shift: e.shiftKey, ctrl: e.ctrlKey || e.metaKey, alt: e.altKey };
    if (controller.key(k)) e.preventDefault();
  };
  const onUp = (e: MouseEvent) => isActive() && controller.up(raw(e, canvas));
  window.addEventListener('keydown', onKey);
  window.addEventListener('mouseup', onUp);
  return () => {
    observer.disconnect();
    off();
    window.removeEventListener('keydown', onKey);
    window.removeEventListener('mouseup', onUp);
  };
}

/**
 * Plátno výkresu jednoho okna: převádí události na body a překresluje při každé změně. Neaktivní okno
 * se klikem nebo kolečkem stane aktivním (koncepce rozhraní, část 2 E).
 */
export function DrawingCanvas(props: { session: Session; controller: Controller; index?: number }) {
  const { session, controller } = props;
  const index = props.index ?? 0;
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(
    () => (ref.current ? attachCanvas(ref.current, session, controller, index) : undefined),
    [session, controller, index],
  );

  const el = () => ref.current as HTMLCanvasElement;
  const wake = () => activate(session, index);
  return (
    <canvas
      ref={ref}
      class="drawing"
      data-testid={index === session.active ? 'drawing-canvas' : 'drawing-canvas-passive'}
      tabIndex={0}
      onMouseDown={(e) => {
        e.preventDefault();
        wake();
        el().focus();
        controller.down(raw(e, el()));
      }}
      onMouseMove={(e) => index === session.active && controller.move(raw(e, el()))}
      onDblClick={(e) => controller.dblclick(raw(e, el()))}
      onMouseEnter={() => !session.valueEdit && el().focus()}
      onMouseLeave={() => controller.leave()}
      onContextMenu={(e) => e.preventDefault()}
      onWheel={(e) => {
        e.preventDefault();
        wake();
        const r = raw(e, el());
        controller.wheel(r.x, r.y, e.deltaY);
      }}
    />
  );
}
