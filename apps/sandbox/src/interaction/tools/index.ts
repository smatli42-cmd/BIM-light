// Registr nástrojů sandboxu. Příkazy nad výběrem bez výběru nezačnou (hláška, zůstane Výběr).
import type { Session } from '../../session/session.ts';
import type { Tool, ToolId } from '../types.ts';
import { AngleTool } from './angle-tool.ts';
import { ArrayTool } from './commands/array-tool.ts';
import { AlignTool, RectTool, SplitTool, TrimTool, ZoomWindowTool } from './commands/edit-tools.ts';
import { PasteTool } from './commands/paste-tool.ts';
import { CopyTool, MirrorTool, MoveTool, RotateTool } from './commands/transform-tools.ts';
import { DimensionTool } from './dimension-tool.ts';
import { SelectTool } from './select/select-tool.ts';
import { WallTool } from './wall-tool.ts';

const FACTORIES: Record<ToolId, (s: Session) => Tool> = {
  select: (s) => new SelectTool(s),
  wall: (s) => new WallTool(s),
  dimension: (s) => new DimensionTool(s),
  angle: (s) => new AngleTool(s),
  move: (s) => new MoveTool(s),
  copy: (s) => new CopyTool(s),
  rotate: (s) => new RotateTool(s),
  mirror: (s) => new MirrorTool(s),
  array: (s) => new ArrayTool(s),
  align: (s) => new AlignTool(s),
  trim: (s) => new TrimTool(s),
  split: (s) => new SplitTool(s),
  rect: (s) => new RectTool(s),
  zoomwin: (s) => new ZoomWindowTool(s),
  paste: (s) => new PasteTool(s),
};

/** Nástroje, které pracují s vybranými stěnami. */
export const NEEDS_SELECTION: readonly ToolId[] = ['move', 'copy', 'rotate', 'mirror', 'array'];

export function createTool(id: ToolId, s: Session): Tool {
  if (NEEDS_SELECTION.includes(id) && !s.selection.walls.length) {
    s.toast('Nejdřív vyber stěny.', 'bad');
    return new SelectTool(s);
  }
  if (id === 'paste' && !s.clipboard) {
    s.toast('Schránka je prázdná.', 'bad');
    return new SelectTool(s);
  }
  return FACTORIES[id](s);
}
