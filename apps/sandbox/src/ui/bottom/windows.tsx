// Spodní lišta – rozvržení oken (koncepce rozhraní, část 2 G): jedno okno, dvě okna vedle sebe.
import type { Session } from '../../session/session.ts';
import { setLayout } from '../../session/windows.ts';
import { IconButton } from '../icons/Icon.tsx';

export function WindowsGroup({ s }: { s: Session }) {
  const n = s.windows.length;
  return (
    <div class="tool-group">
      <IconButton
        icon="layout-one"
        label="Jedno okno"
        testid="layout-1"
        pressed={n === 1}
        onClick={() => setLayout(s, 1)}
      />
      <IconButton
        icon="layout-two"
        label="Dvě okna vedle sebe"
        testid="layout-2"
        pressed={n === 2}
        onClick={() => setLayout(s, 2)}
      />
    </div>
  );
}
