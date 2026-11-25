// Obsah → Projekt (koncepce rozhraní, část 4): místa v modelu. Klik na podlaží otevře jeho pracovní okno
// (nastavení se mění volně, výkresy se nemění). Dole nastavení podlaží.
import { storeysOf } from '@bim-light/core';
import type { Session } from '../../session/session.ts';
import { openStorey } from '../../session/sets.ts';
import { Icon } from '../icons/Icon.tsx';
import { StoreysPanel } from '../StoreysPanel.tsx';

const sign = (e: number) => (e > 0 ? `+${e}` : e < 0 ? `−${Math.abs(e)}` : '±0');

export function ProjectTab({ s }: { s: Session }) {
  const buildingId = s.model.storeys[s.storeyId]?.buildingId ?? '';
  const stack = [...storeysOf(s.model, buildingId)].reverse();
  return (
    <>
      <div class="content-group">Podlaží</div>
      <ul class="content-list" data-testid="content-storeys">
        {stack.map((st) => (
          <li key={st.id}>
            <button
              data-testid={`open-storey-${st.name}`}
              class={!s.view.saved && s.storeyId === st.id ? 'active' : ''}
              onClick={() => openStorey(s, st.id)}
            >
              <Icon name="plan" size={16} />
              <span>{st.name}</span>
              <span class="muted">{sign(st.elevation)}</span>
            </button>
          </li>
        ))}
      </ul>
      <p class="muted">Řezy, pohledy, 3D a výpisy přibudou s dalšími etapami.</p>
      <StoreysPanel s={s} />
    </>
  );
}
