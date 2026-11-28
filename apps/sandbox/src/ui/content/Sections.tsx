// Obsah → Projekt → Řezy a Pohledy (koncepce rozhraní, část 4): seznam řezů a pohledů projektu, klik otevře
// řez v okně, ve kterém se pracuje, místo půdorysu (section-windows.ts); zvýrazněný = v aktivním okně.
// Pohled ukazuje i své označení („1 Pohled jižní“). Dvojklik přejmenuje (section.rename). Tlačítko + u
// Pohledů = příkaz elevation.create: pohledy 1–4 kolem budovy, podruhé jim přepočítá čáry (bez duplikátů).
import type { Section } from '@bim-light/core';
import { useRef, useState } from 'preact/hooks';
import type { Session } from '../../session/session.ts';
import { Icon } from '../icons/Icon.tsx';
import { activeSectionId, openSection } from '../../session/section-windows.ts';

function RenameInput(p: { s: Session; sec: Section; done: () => void }) {
  // Esc zavře pole bez změny; blur při zavření pak už nic nepřejmenuje.
  const closed = useRef(false);
  const close = () => {
    closed.current = true;
    p.done();
  };
  const commit = (name: string) => {
    if (closed.current) return;
    if (name.trim() && name.trim() !== p.sec.name) p.s.run('section.rename', { sectionId: p.sec.id, name });
    close();
  };
  return (
    <input
      data-testid="rename-section"
      class="content-rename"
      value={p.sec.name}
      ref={(el) => el?.focus()}
      onBlur={(e) => commit(e.currentTarget.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') commit(e.currentTarget.value);
        if (e.key === 'Escape') close();
        e.stopPropagation();
      }}
    />
  );
}

function Item(p: { s: Session; sec: Section }) {
  const [editing, setEditing] = useState(false);
  const { s, sec } = p;
  if (editing) return <RenameInput s={s} sec={sec} done={() => setEditing(false)} />;
  return (
    <button
      data-testid={`open-section-${sec.name}`}
      class={activeSectionId(s) === sec.id ? 'active' : ''}
      title="Klik otevře, dvojklik přejmenuje"
      onClick={() => openSection(s, sec.id)}
      onDblClick={() => setEditing(true)}
    >
      <Icon name={sec.kind === 'section' ? 'section' : 'elevation'} size={16} />
      {sec.kind === 'elevation' && <span class="content-mark">{sec.mark}</span>}
      <span>{sec.name}</span>
    </button>
  );
}

/** Pohledy kolem budovy (elevation.create); hláška říká, co se stalo. */
function createElevations(s: Session) {
  const had = Object.values(s.model.sections).some((x) => x.kind === 'elevation');
  const r = s.run('elevation.create', {});
  if (r.ok)
    s.toast(had ? 'Pohledy 1–4 přepočítány podle obrysu budovy.' : 'Přidány pohledy 1–4 kolem budovy.');
}

function Group(p: { title: string; kind: Section['kind']; s: Session; open: (id: string) => void }) {
  const items = Object.values(p.s.model.sections).filter((x) => x.kind === p.kind);
  const around = p.kind === 'elevation';
  const hasAround = around && items.some((x) => ['1', '2', '3', '4'].includes(x.mark));
  return (
    <>
      <div class="content-group content-group-row">
        <span>{p.title}</span>
        {around && (
          <button
            class="content-add"
            data-testid="elevations-around"
            title={
              hasAround ? 'Přepočítat pohledy 1–4 podle obrysu budovy' : 'Přidat pohledy 1–4 kolem budovy'
            }
            aria-label={hasAround ? 'Přepočítat pohledy kolem budovy' : 'Přidat pohledy kolem budovy'}
            onClick={() => createElevations(p.s)}
          >
            {hasAround ? '⟳' : '+'}
          </button>
        )}
      </div>
      <ul class="content-list" data-testid={`content-${p.kind}s`}>
        {items.map((x) => (
          <li key={x.id}>
            <Item s={p.s} sec={x} />
          </li>
        ))}
        {!items.length && <li class="muted">{around ? 'žádné – přidej je tlačítkem +' : 'žádné'}</li>}
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
