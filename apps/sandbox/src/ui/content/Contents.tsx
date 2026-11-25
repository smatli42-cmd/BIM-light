// Obsah projektu (koncepce rozhraní, část 4): záložky Projekt / Pohledy; Výkresy a Export přijdou
// s etapou 7 (jsou vidět zašedlé, aby bylo jasné, kam patří).
import { useState } from 'preact/hooks';
import type { Session } from '../../session/session.ts';
import { ProjectTab } from './ProjectTab.tsx';
import { ViewsTab } from './ViewsTab.tsx';

type Tab = 'project' | 'views';

export function Contents({ s }: { s: Session }) {
  const [tab, setTab] = useState<Tab>('project');
  return (
    <div data-testid="contents">
      <nav class="content-tabs" role="tablist">
        <button
          role="tab"
          data-testid="ct-project"
          aria-selected={tab === 'project'}
          onClick={() => setTab('project')}
        >
          Projekt
        </button>
        <button
          role="tab"
          data-testid="ct-views"
          aria-selected={tab === 'views'}
          onClick={() => setTab('views')}
        >
          Pohledy
        </button>
        <button role="tab" disabled title="Výkresy přijdou s etapou 7">
          Výkresy
        </button>
        <button role="tab" disabled title="Export sad přijde s etapou 7">
          Export
        </button>
      </nav>
      {tab === 'project' ? <ProjectTab s={s} /> : <ViewsTab s={s} />}
    </div>
  );
}
