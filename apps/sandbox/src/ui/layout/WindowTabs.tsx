// Lišta záložek pohledů v záhlaví okna (pokyn uživatele 2026-11-27, princip Arditu; vlastní ikony): ikona podle
// druhu pohledu, název, × zavře. Když se záložky nevejdou, zúží se (název se zkrátí „…“) a lišta se posouvá.
import type { Session } from '../../session/session.ts';
import {
  closeTab,
  currentTab,
  sameTab,
  showPlanTab,
  tabKey,
  windowTabs,
  type ViewTab,
} from '../../session/tabs.ts';
import { activate } from '../../session/windows.ts';
import { open3DView } from '../../view3d/state.ts';
import { Icon } from '../icons/Icon.tsx';
import type { IconName } from '../icons/paths.ts';

function tabIcon(s: Session, t: ViewTab): IconName {
  if (t.kind === 'plan') return 'plan';
  if (t.kind === 'schedule') return 'table';
  if (t.kind === '3d') return 'cube';
  return s.model.sections[t.id]?.kind === 'elevation' ? 'elevation' : 'section';
}

/** Název záložky: podlaží u pracovního okna („1.NP“), jinak název pohledu, řezu, výkazu. */
export function tabLabel(s: Session, t: ViewTab): string {
  if (t.kind === 'plan') {
    const v = s.model.views[t.id];
    if (!v) return '?';
    return v.saved ? v.name : (s.model.storeys[v.storeyId]?.name ?? v.name);
  }
  if (t.kind === 'section') return s.model.sections[t.id]?.name ?? '?';
  if (t.kind === 'schedule') return s.model.schedules[t.id]?.name ?? '?';
  return s.model.views3d[t.id]?.name ?? '?';
}

export function WindowTabs(p: {
  s: Session;
  tabs: readonly ViewTab[];
  current: ViewTab;
  /** Přípona testid (aktivní okno bez přípony, neaktivní „-passive“, 3D okno „-3d“). */
  suffix: string;
  onPick: (t: ViewTab) => void;
  onClose: (t: ViewTab) => void;
}) {
  const { s } = p;
  return (
    <div class="window-tabs" role="tablist" data-testid={`window-tabs${p.suffix}`}>
      {p.tabs.map((t) => {
        const label = tabLabel(s, t);
        const on = sameTab(t, p.current);
        return (
          <div key={tabKey(t)} class={on ? 'view-tab active' : 'view-tab'} title={label}>
            <button
              role="tab"
              aria-selected={on}
              data-testid={`tab${p.suffix}-${label}`}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={() => p.onPick(t)}
            >
              <Icon name={tabIcon(s, t)} size={14} />
              <span>{label}</span>
            </button>
            {p.tabs.length > 1 && (
              <button
                class="view-tab-close"
                aria-label={`Zavřít ${label}`}
                data-testid={`tab-close${p.suffix}-${label}`}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={() => p.onClose(t)}
              >
                ×
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Záložky okna půdorysu / řezu / výkazu `index` (klik přepne okno, × zavře). */
export function PlanWindowTabs({ s, index }: { s: Session; index: number }) {
  const w = s.windows[index];
  if (!w) return null;
  const pick = (t: ViewTab) => {
    activate(s, index);
    if (t.kind === '3d') open3DView(s, t.id);
    else showPlanTab(s, index, t);
  };
  return (
    <WindowTabs
      s={s}
      tabs={windowTabs(s, index)}
      current={currentTab(s, w)}
      suffix={index === s.active ? '' : '-passive'}
      onPick={pick}
      onClose={(t) => closeTab(s, index, t, pick)}
    />
  );
}
