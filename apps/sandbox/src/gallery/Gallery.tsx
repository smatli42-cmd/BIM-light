// Galerie napojení stěn (plán stěn Z2, jen pro posouzení vzhledu rohů): příklady L, T, X, šikmé,
// tři a čtyři konce, v přímce, volný konec a „nespojovat“; přepínač Studie / Projekt.
import { allWallGeometry, drawView, type Vec2 } from '@bim-light/core';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { Viewport } from '../canvas/viewport.ts';
import { drawDrawing } from '../render/primitives.ts';
import { buildExamples, type Example } from './examples.ts';

type StyleName = 'Studie' | 'Projekt';
const SIZE = 420;

function bounds(e: Example): [number, number, number, number] {
  const pts: Vec2[] = [];
  for (const g of allWallGeometry(e.editor.model).values()) for (const o of g.outlines) pts.push(...o);
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
}

/** Výřez kolem uzlu (střed příkladu je vždy v počátku). */
function viewportFor(e: Example, zoom: boolean): Viewport {
  const v = new Viewport();
  v.resize(SIZE, SIZE);
  if (zoom) v.zoomToBox(-650, -650, 650, 650, 6);
  else v.zoomToBox(...bounds(e), 16);
  return v;
}

function Card({ e, style, zoom }: { e: Example; style: StyleName; zoom: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const ctx = ref.current?.getContext('2d');
    if (!ctx) return;
    const m = e.editor.model;
    const styleId = Object.values(m.display.styles).find((s) => s.name === style)?.id;
    if (styleId && m.views[e.viewId]?.styleId !== styleId)
      e.editor.execute('view.setStyle', { viewId: e.viewId, styleId });
    const model = e.editor.model;
    const drawing = drawView(model, e.viewId);
    const v = viewportFor(e, zoom);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, SIZE, SIZE);
    drawDrawing({ ctx, v, pens: model.display.penTable, scale: drawing.scale }, drawing);
  }, [e, style, zoom]);
  return (
    <figure class="gallery-card" data-testid="gallery-card">
      <canvas ref={ref} width={SIZE} height={SIZE} />
      <figcaption>
        <strong>{e.title}</strong>
        <span class="muted">{e.note}</span>
      </figcaption>
    </figure>
  );
}

export function Gallery() {
  const examples = useMemo(() => buildExamples(), []);
  const [style, setStyle] = useState<StyleName>('Projekt');
  const [zoom, setZoom] = useState(true);
  return (
    <div class="gallery">
      <header class="topbar">
        <h1>Galerie napojení stěn</h1>
        {(['Studie', 'Projekt'] as const).map((s) => (
          <button key={s} class={style === s ? 'active' : ''} onClick={() => setStyle(s)}>
            {s}
          </button>
        ))}
        <label>
          <input type="checkbox" checked={zoom} onChange={() => setZoom(!zoom)} /> detail uzlu
        </label>
        <a href="./">← zpět do sandboxu</a>
      </header>
      <div class="gallery-grid">
        {examples.map((e) => (
          <Card key={e.title} e={e} style={style} zoom={zoom} />
        ))}
      </div>
    </div>
  );
}
