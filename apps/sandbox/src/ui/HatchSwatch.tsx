// Náhled šrafy ve čtverečku (knihovna šraf, seznam materiálů): výplň + šrafa z dat (základ 34).
import type { Hatch } from '@bim-light/core';
import { useEffect, useRef } from 'preact/hooks';
import { paintHatch } from '../render/hatch-paint.ts';
import { PX_PER_PAPER_MM } from '../render/primitives.ts';

export function HatchSwatch(props: { hatch: Hatch | undefined; lines: string; fill: string; size?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const size = props.size ?? 48;
  useEffect(() => {
    const ctx = ref.current?.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = props.fill;
    ctx.fillRect(0, 0, size, size);
    if (props.hatch) {
      ctx.save();
      ctx.strokeStyle = props.lines;
      ctx.lineWidth = 0.7;
      paintHatch(ctx, props.hatch, {
        x0: 0,
        y0: 0,
        x1: size,
        y1: size,
        origin: { x: 0, y: 0 },
        pxPerMm: PX_PER_PAPER_MM * 1.5,
      });
      ctx.restore();
    }
    ctx.strokeStyle = '#9aa4ae';
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, size - 1, size - 1);
  }, [props.hatch, props.lines, props.fill, size]);
  return <canvas ref={ref} width={size} height={size} class="swatch" />;
}
