// Registr nástrojů sandboxu. Příkazy nad výběrem bez výběru nezačnou (hláška, zůstane Výběr).
import type { Session } from '../../session/session.ts';
import type { Tool, ToolId } from '../types.ts';
import { AngleTool } from './angle-tool.ts';
import { ArcWallTool } from './arc-wall-tool.ts';
import { ArrayTool } from './commands/array-tool.ts';
import { AlignTool, RectTool, SplitTool, TrimTool, ZoomWindowTool } from './commands/edit-tools.ts';
import { DemolishTool } from './commands/demolish-tool.ts';
import { PasteTool } from './commands/paste-tool.ts';
import { ScaleTool } from './commands/scale-tool.ts';
import { CopyTool, MirrorTool, MoveTool, RotateTool } from './commands/transform-tools.ts';
import { DimensionTool } from './dimension-tool.ts';
import { OpeningTool } from './opening-tool.ts';
import { PickLineTool } from './pick-line-tool.ts';
import { RoomTool } from './room-tool.ts';
import { SectionTool } from './section-tool.ts';
import { LevelDimTool } from './level-dim-tool.ts';
import { CompositionTagTool } from './composition-tag-tool.ts';
import { SlabTool } from './slab-tool.ts';
import { RoofBuildingTool } from './roof-building-tool.ts';
import { roofDefaults } from '../../session/roof-defaults.ts';
import { SlabRoomTool } from './slab-room-tool.ts';
import { SlabWallsTool } from './slab-walls-tool.ts';
import { SelectTool } from './select/select-tool.ts';
import { WallTool } from './wall-tool.ts';

const FACTORIES: Record<ToolId, (s: Session) => Tool> = {
  select: (s) => new SelectTool(s),
  wall: (s) => new WallTool(s),
  arc: (s) => new ArcWallTool(s),
  dimension: (s) => new DimensionTool(s),
  angle: (s) => new AngleTool(s),
  move: (s) => new MoveTool(s),
  copy: (s) => new CopyTool(s),
  rotate: (s) => new RotateTool(s),
  mirror: (s) => new MirrorTool(s),
  array: (s) => new ArrayTool(s),
  scale: (s) => new ScaleTool(s),
  align: (s) => new AlignTool(s),
  trim: (s) => new TrimTool(s),
  split: (s) => new SplitTool(s),
  demolish: (s) => new DemolishTool(s),
  rect: (s) => new RectTool(s),
  zoomwin: (s) => new ZoomWindowTool(s),
  paste: (s) => new PasteTool(s),
  pickline: (s) => new PickLineTool(s),
  opening: (s) => (s.openingDefaults.host === 'slab' ? new SlabTool(s, 'opening') : new OpeningTool(s)),
  // Metoda „podle stěn“ má vlastní nástroj interakce (info box přepne metodu a nástroj znovu vytvoří).
  slab: (s) =>
    s.slab.method === 'walls'
      ? new SlabWallsTool(s)
      : s.slab.method === 'room'
        ? new SlabRoomTool(s)
        : new SlabTool(s),
  roof: (s) => (roofDefaults(s).method === 'building' ? new RoofBuildingTool(s) : new SlabTool(s, 'roof')),
  room: (s) => new RoomTool(s),
  section: (s) => new SectionTool(s),
  levelDim: (s) => new LevelDimTool(s),
  compositionTag: () => new CompositionTagTool(),
};

/** Nástroje, které pracují s vybranými stěnami (přesun, kopie a zrcadlení i s otvory). */
export const NEEDS_SELECTION: readonly ToolId[] = ['move', 'copy', 'rotate', 'mirror', 'array', 'scale'];
const OPENING_OK: readonly ToolId[] = ['move', 'copy', 'mirror'];

export function createTool(id: ToolId, s: Session): Tool {
  const openings = OPENING_OK.includes(id) && s.selection.openings.length > 0;
  if (NEEDS_SELECTION.includes(id) && !s.selection.walls.length && !openings) {
    s.toast('Nejdřív vyber stěny.', 'bad');
    return new SelectTool(s);
  }
  if (id === 'paste' && !s.clipboard) {
    s.toast('Schránka je prázdná.', 'bad');
    return new SelectTool(s);
  }
  return FACTORIES[id](s);
}
