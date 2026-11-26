// Nástroje palety (C) a úpravy lišty příkazů (B): ikona, popisek a zkratka. Popis a zkratku bere
// z registru příkazů jádra (základ 15); nástroje bez vlastního příkazu mají popis tady.
import type { ToolId } from '../../interaction/types.ts';
import type { Session } from '../../session/session.ts';
import type { IconName } from '../icons/paths.ts';

export interface ToolDef {
  readonly tool: ToolId;
  readonly icon: IconName;
  readonly command?: string;
  readonly label?: string;
  readonly key?: string;
  /** Další nástroje, při kterých je tlačítko zvýrazněné (metody Stěny). */
  readonly also?: readonly ToolId[];
}

/** Paleta nástrojů vlevo: výběr, modelování, anotace (koncepce rozhraní, část 2 C). */
export const PALETTE: readonly (readonly ToolDef[])[] = [
  [{ tool: 'select', icon: 'select', label: 'Výběr', key: 'Esc' }],
  [
    { tool: 'wall', icon: 'wall', label: 'Stěna', key: 'W', also: ['rect', 'arc'] },
    { tool: 'pickline', icon: 'wall-line', label: 'Stěna z čáry', key: 'V' },
    { tool: 'opening', icon: 'opening', label: 'Otvor', key: 'O' },
  ],
  [
    { tool: 'dimension', icon: 'dimension', label: 'Kóta', key: 'D' },
    { tool: 'angle', icon: 'angle', label: 'Úhel', key: 'U' },
  ],
];

/** Úpravy výběru v liště příkazů nahoře (koncepce rozhraní, část 2 B). */
export const EDITS: readonly (readonly ToolDef[])[] = [
  [
    { tool: 'move', icon: 'move', command: 'wall.move' },
    { tool: 'copy', icon: 'copy', command: 'wall.copy' },
    { tool: 'rotate', icon: 'rotate', command: 'wall.rotate' },
    { tool: 'mirror', icon: 'mirror', label: 'Zrcadlit', key: 'F' },
    { tool: 'array', icon: 'array', label: 'Pole', key: 'P' },
    { tool: 'scale', icon: 'scale', command: 'wall.scale' },
  ],
  [
    { tool: 'align', icon: 'align', command: 'wall.align' },
    { tool: 'trim', icon: 'trim', command: 'wall.trimToCorner' },
    { tool: 'split', icon: 'split', command: 'wall.split' },
  ],
];

export function describeTool(s: Session, d: ToolDef) {
  const def = d.command ? s.registry.get(d.command) : undefined;
  return {
    label: d.label ?? def?.label ?? d.tool,
    key: d.key ?? def?.shortcut ?? '',
    description: def?.description ?? '',
  };
}

/** Název aktivního nástroje (hlavička info boxu). */
export function toolLabel(s: Session): string {
  for (const d of [...PALETTE, ...EDITS].flat())
    if (d.tool === s.tool.id || d.also?.includes(s.tool.id)) return describeTool(s, d).label;
  return s.tool.id === 'zoomwin' ? 'Přiblížit oknem' : s.tool.id;
}
