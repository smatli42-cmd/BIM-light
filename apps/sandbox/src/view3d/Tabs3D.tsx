// Záložky v záhlaví 3D okna (pokyn uživatele 2026-11-27): historie okna, které 3D nahradilo, a 3D pohledy.
// Klik na 3D záložku přepne 3D pohled, na jinou vrátí na místo 3D pracovní okno s tím pohledem; × zavře.
import type { Session } from '../session/session.ts';
import { sameTab, showPlanTab, type ViewTab } from '../session/tabs.ts';
import { leave3D } from '../session/windows.ts';
import { WindowTabs } from '../ui/layout/WindowTabs.tsx';
import { active3d, focus3D, pick3d, tabs3D, view3d } from './state.ts';

export function Tabs3D({ s }: { s: Session }) {
  const current: ViewTab = { kind: '3d', id: active3d(s).id };
  const pick = (t: ViewTab) => {
    if (t.kind === '3d') return pick3d(s, t.id);
    focus3D(s);
    // Půdorys, kam se vrátit: první záložka půdorysu, jinak pohled aktivního okna.
    const plan = tabs3D(s).find((x) => x.kind === 'plan');
    leave3D(s, plan?.id ?? s.viewId);
    showPlanTab(s, s.active, t);
  };
  const close = (t: ViewTab) => {
    const tabs = tabs3D(s);
    if (tabs.length < 2) return;
    const at = tabs.findIndex((x) => sameTab(x, t));
    const rest = tabs.filter((_, k) => k !== at);
    const next = rest[Math.min(at, rest.length - 1)];
    view3d(s).tabs = rest;
    if (sameTab(t, current) && next) pick(next);
    // Po návratu do půdorysu dostane okno seznam bez zavřené 3D záložky.
    const w = s.windows[s.active];
    if (sameTab(t, current) && next?.kind !== '3d' && w) w.tabs = rest;
    s.changed();
  };
  return <WindowTabs s={s} tabs={tabs3D(s)} current={current} suffix="-3d" onPick={pick} onClose={close} />;
}
