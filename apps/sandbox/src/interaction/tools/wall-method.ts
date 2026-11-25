// Geometrická metoda nástroje Stěna (koncepce rozhraní, část 2 D): jedna stěna, řetěz (s druhem úseku
// v plovoucí nabídce), obdélník, oblouk třemi body. Každá metoda je vlastní nástroj interakce.
import type { ToolId } from '../types.ts';

export type WallMethod = 'single' | 'chain' | 'rect' | 'arc';

/** Nástroj interakce, který metodu kreslí ('wall' = jedna stěna i řetěz). */
export const wallToolFor = (m: WallMethod): ToolId => (m === 'rect' ? 'rect' : m === 'arc' ? 'arc' : 'wall');

/** Nástroje, při kterých je v paletě zvýrazněná Stěna. */
export const WALL_TOOLS: readonly ToolId[] = ['wall', 'rect', 'arc'];
