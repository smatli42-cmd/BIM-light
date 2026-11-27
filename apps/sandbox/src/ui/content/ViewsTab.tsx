// Obsah → Pohledy (koncepce rozhraní, část 4): uložené pohledy aktuální sady s měřítkem, „+ Uložit
// pohled“ z aktivního okna a nastavení vybraného pohledu. Uložený pohled jde na výkresy (etapa 7).
import { openInActive } from '../../session/windows.ts';
import { savedViews, type Id } from '@bim-light/core';
import { useState } from 'preact/hooks';
import type { Session } from '../../session/session.ts';
import { currentSet } from '../../session/sets.ts';
import { Icon } from '../icons/Icon.tsx';
import { ViewSettings } from './ViewSettings.tsx';

export function ViewsTab({ s }: { s: Session }) {
  const [picked, setPicked] = useState<Id | null>(null);
  const set = currentSet(s);
  const views = savedViews(s.model, set);
  const sel = picked && s.model.views[picked] ? picked : s.view.saved ? s.view.id : null;
  const save = () => {
    const r = s.run('view.save', { viewId: s.view.id });
    if (r.ok && r.created[0]) setPicked(r.created[0]);
  };
  return (
    <>
      <ul class="content-list" data-testid="content-views">
        {views.map((v) => (
          <li key={v.id}>
            <button
              data-testid="saved-view"
              class={v.id === sel ? 'active' : ''}
              onClick={() => {
                setPicked(v.id);
                openInActive(s, v.id);
              }}
            >
              <Icon name="plan" size={16} />
              <span>{v.name}</span>
              <span class="muted">1:{v.scale}</span>
            </button>
          </li>
        ))}
        {!views.length && (
          <li class="muted">V sadě {s.model.display.styles[set]?.name} zatím nejsou uložené pohledy.</li>
        )}
      </ul>
      <button data-testid="view-save" onClick={save}>
        + Uložit pohled
      </button>
      {sel && s.model.views[sel] && <ViewSettings key={sel} s={s} viewId={sel} />}
    </>
  );
}
