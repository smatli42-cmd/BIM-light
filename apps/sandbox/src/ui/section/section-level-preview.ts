// Náhled výškové kóty v okně řezu (přesunuto ze section-input.ts, základ 33): čárkovaná úroveň pod kurzorem
// s praporkem na myši při nástroji Výšková kóta, praporek tažené kóty.
import {
  drawLevelSymbol,
  type LevelTarget,
  type Model,
  type Primitive,
  type Section,
  type Vec2,
} from '@bim-light/core';
import type { Viewport } from '../../canvas/viewport.ts';
import { AUX } from '../../render/overlay.ts';

export interface LevelDrag {
  readonly start: Vec2;
  readonly at0: number;
  readonly z: number;
  readonly moved: boolean;
}

export function levelPreview(
  model: Model,
  sec: Section,
  v: Viewport,
  m: Vec2,
  hover: LevelTarget | null,
  drag: LevelDrag | null,
): Primitive[] {
  const g = { ...model.display.baseGraphics, projectionPen: 1 };
  const ghost = (x: number, z: number, below: boolean) =>
    drawLevelSymbol({ x, z, text: '', below, filled: false }, model.display.paperSizes, sec.scale, g, {
      role: 'náhled',
    });
  if (drag?.moved) return ghost(drag.at0 + m.x - drag.start.x, drag.z, m.y < drag.z);
  if (!hover) return [];
  const u0 = Number.isFinite(hover.u0) ? hover.u0 : m.x - v.px(200);
  const u1 = Number.isFinite(hover.u1) ? hover.u1 : m.x + v.px(200);
  const line: Primitive = {
    kind: 'line',
    points: [
      { x: u0, y: hover.z },
      { x: u1, y: hover.z },
    ],
    closed: false,
    stroke: { pen: 1, color: AUX, lineType: 'dashed' },
    source: { role: 'náhled' },
  };
  return [line, ...ghost(m.x, hover.z, false)];
}
