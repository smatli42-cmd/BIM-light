// Lišta nástrojů vlevo. Popisky a zkratky bere z registru příkazů jádra (základ 15),
// nástroje bez vlastního příkazu mají popis tady.
import type { Session } from '../session/session.ts';
import type { ToolId } from '../interaction/types.ts';
import { zoomTo } from '../interaction/keyboard.ts';
import { ExportIfc } from './ExportIfc.tsx';
import { useSession } from './use-session.ts';

interface ToolDef {
  readonly tool: ToolId;
  readonly command?: string;
  readonly label?: string;
  readonly key?: string;
}

const GROUPS: readonly (readonly ToolDef[])[] = [
  [
    { tool: 'select', label: 'Výběr', key: 'Esc' },
    { tool: 'wall', command: 'wall.create' },
    { tool: 'pickline', label: 'Stěna z čáry', key: 'V' },
    { tool: 'rect', command: 'wall.rectangle' },
    { tool: 'opening', command: 'opening.create' },
    { tool: 'dimension', command: 'dimension.create' },
    { tool: 'angle', label: 'Úhel', key: 'U' },
  ],
  [
    { tool: 'move', command: 'wall.move' },
    { tool: 'copy', command: 'wall.copy' },
    { tool: 'rotate', command: 'wall.rotate' },
    { tool: 'mirror', label: 'Zrcadlit', key: 'F' },
    { tool: 'array', label: 'Pole', key: 'P' },
    { tool: 'align', command: 'wall.align' },
    { tool: 'trim', command: 'wall.trimToCorner' },
    { tool: 'split', command: 'wall.split' },
  ],
];

function describe(s: Session, d: ToolDef) {
  const def = d.command ? s.registry.get(d.command) : undefined;
  return {
    label: d.label ?? def?.label ?? d.tool,
    key: d.key ?? def?.shortcut ?? '',
    title: def?.description ?? d.label ?? '',
  };
}

export function Toolbar({ session }: { session: Session }) {
  useSession(session);
  const s = session;
  return (
    <nav class="toolbar" aria-label="Nástroje">
      {GROUPS.map((g, i) => (
        <div class="tool-group" key={i}>
          {g.map((d) => {
            const info = describe(s, d);
            return (
              <button
                key={d.tool}
                data-testid={`tool-${d.tool}`}
                aria-pressed={s.tool.id === d.tool}
                title={info.title}
                onClick={() => s.setTool(d.tool)}
              >
                {info.label} <kbd>{info.key}</kbd>
              </button>
            );
          })}
        </div>
      ))}
      <div class="tool-group">
        <button data-testid="undo" disabled={!s.editor.canUndo} onClick={() => s.editor.undo()}>
          Zpět <kbd>Ctrl+Z</kbd>
        </button>
        <button data-testid="redo" disabled={!s.editor.canRedo} onClick={() => s.editor.redo()}>
          Znovu <kbd>Ctrl+Y</kbd>
        </button>
      </div>
      <div class="tool-group">
        <button data-testid="zoom-all" onClick={() => (zoomTo(s, false), s.changed())}>
          Vše <kbd>Home</kbd>
        </button>
        <button data-testid="zoom-selection" onClick={() => (zoomTo(s, true), s.changed())}>
          Výběr <kbd>Z</kbd>
        </button>
        <button
          data-testid="tool-zoomwin"
          aria-pressed={s.tool.id === 'zoomwin'}
          onClick={() => s.setTool('zoomwin')}
        >
          Okno
        </button>
      </div>
      <ExportIfc s={s} />
    </nav>
  );
}
