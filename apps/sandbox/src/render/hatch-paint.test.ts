import { HATCH_LIBRARY } from '@bim-light/core';
import { describe, expect, it } from 'vitest';
import { paintHatch } from './hatch-paint.ts';

/** Náhradní plátno: jen počítá kreslicí volání. */
function fakeCtx() {
  const calls = { lineTo: 0, arc: 0, fillRect: 0 };
  const noop = () => undefined;
  const ctx = {
    strokeStyle: '#000',
    fillStyle: '#000',
    lineDashOffset: 0,
    beginPath: noop,
    closePath: noop,
    moveTo: noop,
    lineTo: () => void calls.lineTo++,
    arc: () => void calls.arc++,
    stroke: noop,
    fill: noop,
    setLineDash: noop,
    fillRect: () => void calls.fillRect++,
  };
  return { ctx: ctx as unknown as CanvasRenderingContext2D, calls };
}

const AREA = { x0: 0, y0: 0, x1: 200, y1: 150, origin: { x: 0, y: 0 }, pxPerMm: 96 / 25.4 };

describe('katalog-sraf-materialu: kreslení šraf v sandboxu', () => {
  it.each(HATCH_LIBRARY.filter((h) => h.families.length || h.solid).map((h) => [h.name, h]))(
    '%s se vykreslí (něco nakreslí do plochy)',
    (_name, h) => {
      const { ctx, calls } = fakeCtx();
      paintHatch(ctx, h, AREA);
      expect(calls.lineTo + calls.arc + calls.fillRect).toBeGreaterThan(0);
    },
  );
});
