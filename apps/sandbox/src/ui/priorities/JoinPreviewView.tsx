// Živý náhled vzorových spojů v okně Priority spojování: půdorys (rohy L, vnitřní roh, T-spoj) a řez
// stropem na obvodové zdi. Model náhledu staví jádro (joinPreviewModel), kreslí se stejně jako výkres.
import { drawSection, drawView, joinPreviewModel, type Drawing, type Model } from '@bim-light/core';
import { useEffect, useMemo, useRef } from 'preact/hooks';
import { Viewport } from '../../canvas/viewport.ts';
import { drawDrawing } from '../../render/primitives.ts';

const W = 380;
const H = 240;

function bounds(d: Drawing): [number, number, number, number] | null {
  const pts = d.primitives.flatMap((p) =>
    p.kind === 'line' ? [...p.points] : p.kind === 'text' ? [p.at] : [...p.polygon],
  );
  if (!pts.length) return null;
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
}

/** Krátký otisk kresby (pro prohlížečové testy: změnil se spoj?). */
function signature(d: Drawing): string {
  const text = JSON.stringify(d.primitives);
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) | 0;
  return String(h >>> 0);
}

interface PaneProps {
  readonly drawing: Drawing;
  readonly pens: Model['display']['penTable'];
  readonly box?: readonly number[];
  readonly title: string;
  readonly testid: string;
}

function Pane(props: PaneProps) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = W * ratio;
    canvas.height = H * ratio;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);
    const v = new Viewport();
    v.resize(W, H);
    const b = props.box ?? bounds(props.drawing);
    if (b) v.zoomToBox(b[0] ?? 0, b[1] ?? 0, b[2] ?? 1, b[3] ?? 1, 12);
    drawDrawing({ ctx, v, pens: props.pens, scale: props.drawing.scale }, props.drawing);
  }, [props.drawing, props.box, props.pens]);
  return (
    <figure class="jp-pane">
      <canvas
        ref={ref}
        style={{ width: `${W}px`, height: `${H}px` }}
        data-testid={props.testid}
        data-sig={signature(props.drawing)}
      />
      <figcaption class="muted">{props.title}</figcaption>
    </figure>
  );
}

export function JoinPreviewView({ model }: { model: Model }) {
  const built = useMemo(() => {
    const p = joinPreviewModel(model);
    if (!p) return null;
    const section = p.sectionId ? drawSection(p.model, p.sectionId) : null;
    return { p, plan: drawView(p.model, p.viewId), section };
  }, [model]);
  if (!built) return <p class="muted">Projekt nemá typ obvodové stěny, náhled nejde postavit.</p>;
  const { p, plan, section } = built;
  const pens = p.model.display.penTable;
  return (
    <div class="jp-preview" data-testid="priorities-preview">
      <Pane
        drawing={plan}
        pens={pens}
        box={p.box}
        title="Půdorys: rohy L (i vnitřní), T-spoj příčky"
        testid="jp-plan"
      />
      <Pane
        drawing={plan}
        pens={pens}
        box={p.detail}
        title="Detail: vnitřní roh zateplené stěny a nezateplené zdi"
        testid="jp-detail"
      />
      {section && (
        <Pane drawing={section} pens={pens} title="Řez: strop uložený na obvodové zdi" testid="jp-section" />
      )}
    </div>
  );
}
