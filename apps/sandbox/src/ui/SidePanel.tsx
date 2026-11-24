// Pravý panel se záložkami: Vlastnosti (výběr, nová stěna, volby), Materiály, Knihovna šraf.
import { useState } from 'preact/hooks';
import type { Session } from '../session/session.ts';
import { HatchLibrary } from './HatchLibrary.tsx';
import { LayersPanel } from './LayersPanel.tsx';
import { MaterialsPanel } from './MaterialsPanel.tsx';
import { PropertiesPanel } from './PropertiesPanel.tsx';
import { useSession } from './use-session.ts';

type Tab = 'props' | 'layers' | 'materials' | 'hatches';
const TABS: [Tab, string][] = [
  ['props', 'Vlastnosti'],
  ['layers', 'Vrstvy'],
  ['materials', 'Materiály'],
  ['hatches', 'Šrafy'],
];

export function SidePanel({ session }: { session: Session }) {
  useSession(session);
  const [tab, setTab] = useState<Tab>('props');
  return (
    <aside class="panel" data-testid="panel">
      <nav class="tabs">
        {TABS.map(([t, label]) => (
          <button
            key={t}
            data-testid={`tab-${t}`}
            class={tab === t ? 'active' : ''}
            onClick={() => setTab(t)}
          >
            {label}
          </button>
        ))}
      </nav>
      {tab === 'props' && <PropertiesPanel session={session} />}
      {tab === 'layers' && <LayersPanel s={session} />}
      {tab === 'materials' && <MaterialsPanel s={session} />}
      {tab === 'hatches' && <HatchLibrary />}
    </aside>
  );
}
