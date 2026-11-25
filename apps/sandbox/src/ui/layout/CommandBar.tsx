// B – lišta příkazů (koncepce rozhraní, část 2): lupa = Najít a vybrat (jako vzor / Archicad) a úpravy
// výběru.
import { useState } from 'preact/hooks';
import type { Session } from '../../session/session.ts';
import { FindPanel } from '../find/FindPanel.tsx';
import { IconButton } from '../icons/Icon.tsx';
import { useSession } from '../use-session.ts';
import { ToolGroups } from './ToolButtons.tsx';
import { EDITS } from './tool-defs.ts';

export function CommandBar({ s }: { s: Session }) {
  useSession(s);
  const [finding, setFinding] = useState(false);
  return (
    <nav class="commandbar" aria-label="Příkazy" data-testid="commandbar">
      <div class="tool-group">
        <IconButton
          icon="search"
          label="Najít a vybrat"
          testid="find-open"
          pressed={finding}
          onClick={() => setFinding(!finding)}
        />
      </div>
      <ToolGroups s={s} groups={EDITS} />
      {finding && <FindPanel s={s} onClose={() => setFinding(false)} />}
    </nav>
  );
}
