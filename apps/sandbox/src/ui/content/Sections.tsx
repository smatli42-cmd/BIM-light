// Obsah → Projekt → Řezy a Pohledy (koncepce rozhraní, část 4): seznam řezů a pohledů projektu, klik otevře
// řez v okně, ve kterém se pracuje, místo půdorysu (section-windows.ts); zvýrazněný = v aktivním okně.
// Pohled ukazuje i své označení na jednom řádku („1  Jižní“). Dvojklik přejmenuje (section.rename), Delete
// smaže. Pohledy 1–4 vznikají samy; ⟳ u Pohledů (jen když je co obnovit) = elevation.create.
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
      title="Klik otevře, dvojklik přejmenuje, Delete smaže"
      onClick={() => openSection(s, sec.id)}
      onDblClick={() => setEditing(true)}
      onKeyDown={(e) => {
        if (e.key !== 'Delete') return;
        e.stopPropagation();
        s.run('section.delete', { sectionId: sec.id });
      }}
    >
      <Icon name={sec.kind === 'section' ? 'section' : 'elevation'} size={16} />
      {sec.kind === 'elevation' && <span class="content-mark">{sec.mark}</span>}
      <span class="content-name">{sec.name}</span>
    </button>
  );
}

/** Obnoví automatické pohledy (smazané vrátí, posunuté odemkne): příkaz elevation.create. */
function restoreElevations(s: Session) {
  if (s.run('elevation.create', {}).ok) s.toast('Pohledy 1–4 obnoveny podle obrysu budovy.');
}

/** Je co obnovit: smazaný nebo ručně posunutý automatický pohled. */
function canRestore(s: Session): boolean {
  const locked = Object.values(s.model.sections).some((x) => x.auto?.locked);
  return locked || s.model.elevationsAround.removed.length > 0;
}

function Group(p: { title: string; kind: Section['kind']; s: Session }) {
  const items = Object.values(p.s.model.sections).filter((x) => x.kind === p.kind);
  const restore = p.kind === 'elevation' && canRestore(p.s);
  return (
    <>
      <div class="content-group content-group-row">
        <span>{p.title}</span>
        {restore && (
          <button
            class="content-add"
            data-testid="elevations-restore"
            title="Obnovit pohledy kolem budovy (smazané vrátí, posunuté vrátí k obrysu)"
            aria-label="Obnovit pohledy kolem budovy"
            onClick={() => restoreElevations(p.s)}
          >
            ⟳
          </button>
        )}
      </div>
      <ul class="content-list" data-testid={`content-${p.kind}s`}>
        {items.map((x) => (
          <li key={x.id}>
            <Item s={p.s} sec={x} />
          </li>
        ))}
        {!items.length && <li class="muted">žádné</li>}
      </ul>
    </>
  );
}

export function Sections({ s }: { s: Session }) {
  return (
    <>
      <Group title="Řezy" kind="section" s={s} />
      <Group title="Pohledy" kind="elevation" s={s} />
    </>
  );
}
