// Spodní lišta – Zobrazit výběr ve 3D (F4) a Zobrazit vše ve 3D (Ctrl+F4; koncepce rozhraní, část 2 G,
// řádek 10). Obojí otevře 3D okno vedle půdorysu.
import type { Session } from '../session/session.ts';
import { IconButton } from '../ui/icons/Icon.tsx';
import { show3D, view3d } from './state.ts';

export function View3DGroup({ s }: { s: Session }) {
  const st = view3d(s);
  return (
    <div class="tool-group">
      <IconButton
        icon="cube-selection"
        label="Zobrazit výběr ve 3D"
        shortcut="F4"
        description="Otevře 3D okno vedle půdorysu jen s vybranými prvky (bez výběru celý model)."
        testid="show-3d-selection"
        pressed={st.open && !!st.only}
        onClick={() => show3D(s, true)}
      />
      <IconButton
        icon="cube"
        label="Zobrazit vše ve 3D"
        shortcut="Ctrl+F4 / Shift+F4"
        description="Otevře 3D okno vedle půdorysu s celým modelem podle stylu a filtru rekonstrukce pohledu."
        testid="show-3d-all"
        pressed={st.open && !st.only}
        onClick={() => show3D(s, false)}
      />
    </div>
  );
}
