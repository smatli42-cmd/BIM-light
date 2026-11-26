// Živý náhled řezu skladby (editor typu stěny, plán stěn Z1): vrstvy vedle sebe od referenční
// strany (vlevo), výplň a šrafa z materiálu, hranice vrstev a červená referenční čára.
import {
  bandThickness,
  materialFill,
  materialLines,
  referenceDepth,
  type HeightBand,
  type Model,
  type ReferenceLine,
} from '@bim-light/core';
import { useEffect, useRef } from 'preact/hooks';
import { paintHatch } from '../../render/hatch-paint.ts';
import { PX_PER_PAPER_MM } from '../../render/primitives.ts';

const WIDTH = 260;
const HEIGHT = 90;
const PAD = 8;

function paintLayers(ctx: CanvasRenderingContext2D, model: Model, band: HeightBand, k: number, H: number) {
  let x = PAD;
  for (const l of band.layers) {
    const w = l.thickness * k;
    const m = model.materials[l.materialId];
    ctx.fillStyle = m ? materialFill(m) : '#eeeeee';
    ctx.fillRect(x, PAD, w, H - 2 * PAD);
    const hatch = m ? model.display.hatches[m.hatchId] : undefined;
    if (m && hatch) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, PAD, w, H - 2 * PAD);
      ctx.clip();
      ctx.strokeStyle = materialLines(m);
      ctx.lineWidth = 0.7;
      const area = { x0: x, y0: PAD, x1: x + w, y1: H - PAD, origin: { x: 0, y: 0 } };
      paintHatch(ctx, hatch, { ...area, pxPerMm: PX_PER_PAPER_MM });
      ctx.restore();
    }
    ctx.strokeStyle = '#222222';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, PAD + 0.5, w, H - 2 * PAD - 1);
    x += w;
  }
}

export function TypePreview(props: {
  model: Model;
  band: HeightBand;
  refLine: ReferenceLine;
  width?: number;
  height?: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const { model, band, refLine } = props;
  const W = props.width ?? WIDTH;
  const H = props.height ?? HEIGHT;
  useEffect(() => {
    const ctx = ref.current?.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, W, H);
    const t = bandThickness(band);
    if (t <= 0) return;
    const k = (W - 2 * PAD) / t;
    paintLayers(ctx, model, band, k, H);
    const rx = PAD + referenceDepth(band, refLine) * k;
    ctx.strokeStyle = '#d32f2f';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 3]);
    ctx.beginPath();
    ctx.moveTo(rx, 2);
    ctx.lineTo(rx, H - 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }, [model, band, refLine, W, H]);
  return <canvas ref={ref} width={W} height={H} class="type-preview" data-testid="type-preview" />;
}
