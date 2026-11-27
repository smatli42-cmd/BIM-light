// Obsah → Projekt → Řezy a Pohledy (koncepce rozhraní, část 4): seznam řezů a pohledů projektu, klik otevře
// okno s kresbou z modelu. Zakládání a úpravy zatím jen příkazy (AI) – nástroj Řez přijde podle Arditu.
import type { Section } from '@bim-light/core';
import { useState } from 'preact/hooks';
import type { Session } from '../../session/session.ts';
import { Icon } from '../icons/Icon.tsx';
import { SectionDialog } from '../section/SectionDialog.tsx';

function Group(p: { title: string; kind: Section['kind']; s: Session; open: (id: string) => void }) {
  const items = Object.values(p.s.model.sections).filter((x) => x.kind === p.kind);
  return (
    <>
      <div class="content-group">{p.title}</div>
      <ul class="content-list" data-testid={`content-${p.kind}s`}>
        {items.map((x) => (
          <li key={x.id}>
            <button data-testid={`open-section-${x.name}`} onClick={() => p.open(x.id)}>
              <Icon name={p.kind === 'section' ? 'section' : 'elevation'} size={16} />
              <span>{x.name}</span>
            </button>
          </li>
        ))}
        {!items.length && <li class="muted">žádné</li>}
      </ul>
    </>
  );
}

export function Sections({ s }: { s: Session }) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <>
      <Group title="Řezy" kind="section" s={s} open={setOpen} />
      <Group title="Pohledy" kind="elevation" s={s} open={setOpen} />
      {open && <SectionDialog s={s} sectionId={open} onClose={() => setOpen(null)} />}
    </>
  );
}
