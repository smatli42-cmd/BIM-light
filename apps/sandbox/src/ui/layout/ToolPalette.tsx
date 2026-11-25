// C – paleta nástrojů vlevo (koncepce rozhraní, část 2): jen ikony, bublina = název + zkratka + popis.
import type { Session } from '../../session/session.ts';
import { useSession } from '../use-session.ts';
import { ToolGroups } from './ToolButtons.tsx';
import { PALETTE } from './tool-defs.ts';

export function ToolPalette({ s }: { s: Session }) {
  useSession(s);
  return (
    <nav class="palette" aria-label="Nástroje" data-testid="palette">
      <ToolGroups s={s} groups={PALETTE} />
    </nav>
  );
}
