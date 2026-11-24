// Pravý panel se záložkami: Vlastnosti (výběr, nová stěna, volby), Podlaží, Vrstvy, Typy stěn, Materiály,
// Knihovna šraf.
import { useState } from 'preact/hooks';
import type { Session } from '../session/session.ts';
import { HatchLibrary } from './HatchLibrary.tsx';
import { LayersPanel } from './LayersPanel.tsx';
import { MaterialsPanel } from './MaterialsPanel.tsx';
import { PropertiesPanel } from './PropertiesPanel.tsx';
import { StoreysPanel } from './StoreysPanel.tsx';
import { useSession } from './use-session.ts';
import { WallTypesPanel } from './WallTypesPanel.tsx';

type Tab = 'props' | 'storeys' | 'layers' | 'types' | 'materials' | 'hatches';
const TABS: [Tab, string][] = [
  ['props', 'Vlastnosti'],
  ['storeys', 'Podlaží'],
  ['layers', 'Vrstvy'],
  ['types', 'Typy stěn'],
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
      {tab === 'storeys' && <StoreysPanel s={session} />}
      {tab === 'layers' && <LayersPanel s={session} />}
      {tab === 'types' && <WallTypesPanel s={session} />}
      {tab === 'materials' && <MaterialsPanel s={session} />}
      {tab === 'hatches' && <HatchLibrary />}
    </aside>
  );
}
