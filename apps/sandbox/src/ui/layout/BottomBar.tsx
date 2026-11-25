// G – spodní lišta zobrazení aktivního okna (koncepce rozhraní, část 2): zoom, šrafy, rovina řezu,
// skupina anotací; vpravo nápověda a stav. Vrstvy, přichytávání a fáze přibudou v kroku UI4.
import { zoomTo } from '../../interaction/keyboard.ts';
import type { Session } from '../../session/session.ts';
import { IconButton } from '../icons/Icon.tsx';
import { useSession } from '../use-session.ts';
import { AnnotationGroup, CutPlane, HatchScale } from '../ViewControls.tsx';

function zoomBy(s: Session, k: number) {
  s.viewport.zoomAt({ x: s.viewport.width / 2, y: s.viewport.height / 2 }, k);
  s.changed();
}

export function BottomBar({ s }: { s: Session }) {
  useSession(s);
  const w = s.cursor.world;
  return (
    <footer class="bottombar" data-testid="bottombar">
      <div class="tool-group">
        <IconButton icon="zoom-out" label="Oddálit" onClick={() => zoomBy(s, 1 / 1.25)} />
        <IconButton icon="zoom-in" label="Přiblížit" onClick={() => zoomBy(s, 1.25)} />
        <IconButton
          icon="zoom-all"
          label="Vše"
          shortcut="Home"
          testid="zoom-all"
          onClick={() => (zoomTo(s, false), s.changed())}
        />
        <IconButton
          icon="zoom-selection"
          label="Výběr"
          shortcut="Z"
          testid="zoom-selection"
          onClick={() => (zoomTo(s, true), s.changed())}
        />
        <IconButton
          icon="zoom-window"
          label="Přiblížit oknem"
          testid="tool-zoomwin"
          pressed={s.tool.id === 'zoomwin'}
          onClick={() => s.setTool('zoomwin')}
        />
      </div>
      <HatchScale s={s} />
      <CutPlane s={s} />
      <AnnotationGroup s={s} />
      <span class="hint" data-testid="hint">
        {s.tool.hint()}
      </span>
      <span class="muted status-info">
        X {Math.round(w.x)} Y {Math.round(w.y)} · 1:{s.view.scale} · výběr {s.selection.walls.length} stěn,{' '}
        {s.selection.dims.length} kót
      </span>
    </footer>
  );
}
