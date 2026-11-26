// Geometrická metoda nástroje Stěna (koncepce rozhraní, část 2 D): jedna stěna, řetěz (s druhem úseku
// v plovoucí nabídce), obdélník, oblouk třemi body, z čáry (Revit „Vybrat čáry“; klik na líc / později
// 2D čáru). Každá metoda je vlastní nástroj interakce.
import type { ToolId } from '../types.ts';

export type WallMethod = 'single' | 'chain' | 'rect' | 'arc' | 'pick';

/** Nástroj interakce, který metodu kreslí ('wall' = jedna stěna i řetěz). */
const METHOD_TOOL: Partial<Record<WallMethod, ToolId>> = { rect: 'rect', arc: 'arc', pick: 'pickline' };
export const wallToolFor = (m: WallMethod): ToolId => METHOD_TOOL[m] ?? 'wall';

/** Metoda, kterou zapíná nástroj interakce (zkratka B / A / V), nebo undefined. */
export const methodOfTool = (id: ToolId): WallMethod | undefined =>
  (Object.keys(METHOD_TOOL) as WallMethod[]).find((m) => METHOD_TOOL[m] === id);

/** Nástroje, při kterých je v paletě zvýrazněná Stěna. */
export const WALL_TOOLS: readonly ToolId[] = ['wall', 'rect', 'arc', 'pickline'];
