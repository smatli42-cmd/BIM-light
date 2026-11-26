// Náhled skladby v okně Editor typů (krok 2, koncepce rozhraní 11a): záložky Půdorys / Řez / 3D, skutečný
// poměr vrstev, šrafy, kóty tlouštěk a referenční čára. Klik na vrstvu ji vybere (i v tabulce vrstev).
import { referenceDepth, type HeightBand, type Model, type ReferenceLine } from '@bim-light/core';
import { useEffect, useRef } from 'preact/hooks';
import { layerAt, previewLayout, type PreviewMode } from './preview-layout.ts';
import { paintPreview, type PreviewColors } from './preview-paint.ts';

const W = 440;
const H = 300;
const MODES: [PreviewMode, string][] = [
  ['plan', 'Půdorys'],
  ['section', 'Řez'],
  ['iso', '3D'],
];

function colors(el: HTMLElement): PreviewColors {
  const css = getComputedStyle(el);
  const get = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;
  return {
    paper: get('--paper', '#ffffff'),
    ink: get('--ink', '#182033'),
    accent: get('--accent', '#2563eb'),
    ref: '#d32f2f',
  };
}

interface Props {
  readonly model: Model;
  readonly band: HeightBand;
  readonly refLine: ReferenceLine;
  readonly mode: PreviewMode;
  readonly onMode: (m: PreviewMode) => void;
  readonly selected: number | null;
  readonly onSelect: (layer: number | null) => void;
}

function ModeTabs(p: { mode: PreviewMode; onMode: (m: PreviewMode) => void }) {
  return (
    <span class="te-modes" role="tablist">
      {MODES.map(([m, label]) => (
        <button
          key={m}
          role="tab"
          data-testid={`preview-${m}`}
          aria-selected={p.mode === m}
          class={p.mode === m ? 'active' : ''}
          onClick={() => p.onMode(m)}
        >
          {label}
        </button>
      ))}
    </span>
  );
}

export function CompositionPreview(p: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const layers = p.band.layers;
  const layout = previewLayout(p.mode, layers, referenceDepth(p.band, p.refLine), W, H);
  useEffect(() => {
    const el = ref.current;
    const ctx = el?.getContext('2d');
    if (!el || !ctx) return;
    const dpr = window.devicePixelRatio || 1;
    el.width = Math.round(W * dpr);
    el.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const c = colors(el);
    ctx.fillStyle = c.paper;
    ctx.fillRect(0, 0, W, H);
    const materials = layers.map((l) => l.materialId);
    paintPreview(ctx, p.model, layout, materials, p.selected, c);
  });
  const click = (e: MouseEvent) => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = ((e.clientX - r.left) * W) / r.width;
    const y = ((e.clientY - r.top) * H) / r.height;
    p.onSelect(layerAt(layout, { x, y }));
  };
  return (
    <div class="te-canvas">
      <ModeTabs mode={p.mode} onMode={p.onMode} />
      <canvas
        ref={ref}
        class="type-preview"
        data-testid="type-preview"
        data-mode={p.mode}
        style={{ width: `${W}px`, aspectRatio: `${W} / ${H}` }}
        onClick={click}
      />
    </div>
  );
}
