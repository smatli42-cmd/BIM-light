// Obsah → Projekt (koncepce rozhraní, část 4): místa v modelu. Klik na podlaží otevře jeho pracovní okno
// (nastavení se mění volně, výkresy se nemění), klik na 3D pohled otevře 3D okno, klik na řez okno řezu. Zvýrazněná položka =
// okno, ve kterém se pracuje. Dole nastavení podlaží.
import { storeysOf } from '@bim-light/core';
import type { Session } from '../../session/session.ts';
import { openStorey } from '../../session/sets.ts';
import { Icon } from '../icons/Icon.tsx';
import { StoreysPanel } from '../StoreysPanel.tsx';
import { Schedules } from './Schedules.tsx';
import { Sections } from './Sections.tsx';
import { activeTabOf } from '../../session/section-windows.ts';
import { active3d, is3DFocused, open3DView, view3d } from '../../view3d/state.ts';

const sign = (e: number) => (e > 0 ? `+${e}` : e < 0 ? `−${Math.abs(e)}` : '±0');

export function ProjectTab({ s }: { s: Session }) {
  const buildingId = s.model.storeys[s.storeyId]?.buildingId ?? '';
  const stack = [...storeysOf(s.model, buildingId)].reverse();
  const focused3d = is3DFocused(s);
  const shown3d = view3d(s).open ? active3d(s).id : null;
  return (
    <>
      <div class="content-group">Podlaží</div>
      <ul class="content-list" data-testid="content-storeys">
        {stack.map((st) => (
          <li key={st.id}>
            <button
              data-testid={`open-storey-${st.name}`}
              class={
                !s.view.saved && s.storeyId === st.id && activeTabOf(s, 'plan') === s.viewId ? 'active' : ''
              }
              onClick={() => openStorey(s, st.id)}
            >
              <Icon name="plan" size={16} />
              <span>{st.name}</span>
              <span class="muted">{sign(st.elevation)}</span>
            </button>
          </li>
        ))}
      </ul>
      <div class="content-group">3D</div>
      <ul class="content-list" data-testid="content-3d">
        {Object.values(s.model.views3d).map((v) => (
          <li key={v.id}>
            <button
              data-testid={`open-3d-${v.name}`}
              class={focused3d && shown3d === v.id ? 'active' : ''}
              onClick={() => open3DView(s, v.id)}
            >
              <Icon name="cube" size={16} />
              <span>{v.name}</span>
            </button>
          </li>
        ))}
      </ul>
      <Sections s={s} />
      <Schedules s={s} />
      <StoreysPanel s={s} />
    </>
  );
}
