// G – spodní lišta zobrazení aktivního okna (koncepce rozhraní, část 2 G, podle vzoru): zoom a okna,
// trasování, přichytávání, vrstvy, vzhled (čáry, materiál, popisy, pera), přepisy, šrafy,
// rovina řezu, skupina anotací, Odhalit; vpravo nápověda a souřadnice.
import type { Session } from '../../session/session.ts';
import { LayerGroup, SnapGroup, ZoomGroup } from '../bottom/groups.tsx';
import { TraceGroup } from '../bottom/trace.tsx';
import { LookGroup, OverridesMenu, RevealToggle } from '../bottom/look.tsx';
import { WindowsGroup } from '../bottom/windows.tsx';
import { PhaseMenu, StructureMenu } from '../bottom/phase.tsx';
import { useSession } from '../use-session.ts';
import { AnnotationGroup, CutPlane, HatchScale } from '../ViewControls.tsx';

export function BottomBar({ s }: { s: Session }) {
  useSession(s);
  const w = s.cursor.world;
  return (
    <footer class="bottombar" data-testid="bottombar">
      <ZoomGroup s={s} />
      <WindowsGroup s={s} />
      <TraceGroup s={s} />
      <SnapGroup s={s} />
      <LayerGroup s={s} />
      <LookGroup s={s} />
      <OverridesMenu s={s} />
      <StructureMenu s={s} />
      <PhaseMenu s={s} />
      <HatchScale s={s} />
      <CutPlane s={s} />
      <AnnotationGroup s={s} />
      <RevealToggle s={s} />
      <span class="hint" data-testid="hint" title={s.tool.hint()}>
        {s.tool.hint()}
      </span>
      <span class="muted status-info">
        X {Math.round(w.x)} Y {Math.round(w.y)} · výběr {s.selection.walls.length}
      </span>
    </footer>
  );
}
