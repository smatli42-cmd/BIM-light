// B – lišta příkazů (koncepce rozhraní, část 2): hledání příkazů (Ctrl+K, krok UI3) a úpravy výběru.
import type { Session } from '../../session/session.ts';
import { IconButton } from '../icons/Icon.tsx';
import { useSession } from '../use-session.ts';
import { ToolGroups } from './ToolButtons.tsx';
import { EDITS } from './tool-defs.ts';

export function CommandBar({ s }: { s: Session }) {
  useSession(s);
  return (
    <nav class="commandbar" aria-label="Příkazy" data-testid="commandbar">
      <div class="tool-group">
        <IconButton
          icon="search"
          label="Hledat příkaz"
          shortcut="Ctrl+K"
          description="Najde a spustí příkaz podle názvu (připravuje se v kroku UI3)."
          disabled
          onClick={() => undefined}
        />
      </div>
      <ToolGroups s={s} groups={EDITS} />
    </nav>
  );
}
