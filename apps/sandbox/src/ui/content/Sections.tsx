// Obsah → Projekt → Řezy a Pohledy (koncepce rozhraní, část 4): seznam řezů a pohledů projektu, klik otevře
// řez v okně, ve kterém se pracuje, místo půdorysu (section-windows.ts); zvýrazněný = v aktivním okně.
import type { Section } from '@bim-light/core';
import type { Session } from '../../session/session.ts';
import { Icon } from '../icons/Icon.tsx';
import { activeSectionId, openSection } from '../../session/section-windows.ts';

function Group(p: { title: string; kind: Section['kind']; s: Session; open: (id: string) => void }) {
  const items = Object.values(p.s.model.sections).filter((x) => x.kind === p.kind);
  return (
    <>
      <div class="content-group">{p.title}</div>
      <ul class="content-list" data-testid={`content-${p.kind}s`}>
        {items.map((x) => (
          <li key={x.id}>
            <button
              data-testid={`open-section-${x.name}`}
              class={activeSectionId(p.s) === x.id ? 'active' : ''}
              onClick={() => p.open(x.id)}
            >
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
  const open = (id: string) => openSection(s, id);
  return (
    <>
      <Group title="Řezy" kind="section" s={s} open={open} />
      <Group title="Pohledy" kind="elevation" s={s} open={open} />
    </>
  );
}
