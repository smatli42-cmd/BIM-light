// F – Obsah projektu vpravo a F' – svislá lišta sekcí (koncepce rozhraní, část 2). Křížek panel skryje
// (víc místa pro výkres), ikona sekce ho znovu otevře. Obsah se záložkami Projekt / Pohledy je krok UI3.
import { useState } from 'preact/hooks';
import type { Session } from '../../session/session.ts';
import { HatchLibrary } from '../HatchLibrary.tsx';
import { IconButton } from '../icons/Icon.tsx';
import type { IconName } from '../icons/paths.ts';
import { LayersPanel } from '../LayersPanel.tsx';
import { MaterialsPanel } from '../MaterialsPanel.tsx';
import { StoreysPanel } from '../StoreysPanel.tsx';
import { useSession } from '../use-session.ts';
import { WallTypesPanel } from '../WallTypesPanel.tsx';

type Section = 'storeys' | 'layers' | 'types' | 'materials' | 'hatches';
const SECTIONS: [Section, IconName, string][] = [
  ['storeys', 'storeys', 'Podlaží'],
  ['layers', 'layers', 'Vrstvy'],
  ['types', 'wall-types', 'Typy stěn'],
  ['materials', 'materials', 'Materiály'],
  ['hatches', 'hatches', 'Šrafy'],
];

export function ContentPanel({ s }: { s: Session }) {
  useSession(s);
  const [open, setOpen] = useState<Section | null>('storeys');
  const title = SECTIONS.find((x) => x[0] === open)?.[2] ?? '';
  return (
    <>
      {open && (
        <aside class="content panel" data-testid="panel">
          <div class="content-head">
            <h2 class="content-title">{title}</h2>
            <IconButton icon="close" label="Skrýt panel" testid="panel-close" onClick={() => setOpen(null)} />
          </div>
          {open === 'storeys' && <StoreysPanel s={s} />}
          {open === 'layers' && <LayersPanel s={s} />}
          {open === 'types' && <WallTypesPanel s={s} />}
          {open === 'materials' && <MaterialsPanel s={s} />}
          {open === 'hatches' && <HatchLibrary />}
        </aside>
      )}
      <nav class="sections" aria-label="Sekce panelu">
        {SECTIONS.map(([id, icon, label]) => (
          <IconButton
            key={id}
            icon={icon}
            label={label}
            testid={`tab-${id}`}
            pressed={open === id}
            onClick={() => setOpen(id)}
          />
        ))}
      </nav>
    </>
  );
}
