// Panel Typy stěn (plán stěn Z1): seznam s hledáním, tloušťkou a Použitím; rozbalení = editor
// typu. Nový typ, načtení z knihovny typů a vyčištění nepoužitých. Vše přes příkazy jádra.
import { bandThickness, WALL_TYPE_LIBRARY, wallTypeUsage, type WallType } from '@bim-light/core';
import { useState } from 'preact/hooks';
import type { Session } from '../session/session.ts';
import { WallTypeEditor } from './WallTypeEditor.tsx';

function freeName(s: Session, base: string): string {
  const names = new Set(Object.values(s.model.wallTypes).map((t) => t.name));
  let name = base;
  for (let i = 2; names.has(name); i++) name = `${base} ${i}`;
  return name;
}

function LibraryLoad({ s }: { s: Session }) {
  const inProject = new Set(Object.values(s.model.wallTypes).map((t) => t.source?.itemId));
  const missing = WALL_TYPE_LIBRARY.filter((t) => !inProject.has(t.key));
  const [key, setKey] = useState('');
  if (missing.length === 0) return null;
  const pick = missing.some((t) => t.key === key) ? key : (missing[0]?.key ?? '');
  return (
    <label>
      Z knihovny typů
      <span class="row">
        <select data-testid="type-library" value={pick} onChange={(e) => setKey(e.currentTarget.value)}>
          {missing.map((t) => (
            <option key={t.key} value={t.key}>
              {t.name}
            </option>
          ))}
        </select>
        <button data-testid="type-load" onClick={() => s.run('wallType.load', { key: pick })}>
          Načíst
        </button>
      </span>
    </label>
  );
}

function TypeItem(props: { s: Session; t: WallType; open: boolean; onToggle: () => void }) {
  const { s, t } = props;
  return (
    <li>
      <button class="material-row" data-testid="type-row" onClick={props.onToggle}>
        <span>{t.name}</span>
        <span class="muted">
          {t.bands[0] ? bandThickness(t.bands[0]) : 0} mm · {wallTypeUsage(s.model, t.id)}×
        </span>
      </button>
      {props.open && <WallTypeEditor s={s} type={t} />}
    </li>
  );
}

export function WallTypesPanel({ s }: { s: Session }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const all = Object.values(s.model.wallTypes);
  const q = query.trim().toLowerCase();
  const shown = all.filter((t) => !q || t.name.toLowerCase().includes(q));
  const material =
    Object.values(s.model.materials).find((m) => m.category === 'Zdivo') ??
    Object.values(s.model.materials)[0];
  const create = () => {
    const r = s.run('wallType.create', {
      name: freeName(s, 'Nový typ'),
      layers: [{ materialId: material?.id ?? '', thickness: 200, function: 'core' }],
    });
    if (r.ok) setOpen(r.created[0] ?? null);
  };
  return (
    <section data-testid="wall-types">
      <h2>Typy stěn · {all.length}</h2>
      <input
        data-testid="type-search"
        placeholder="Hledat…"
        value={query}
        onInput={(e) => setQuery(e.currentTarget.value)}
      />
      <ul class="material-list">
        {shown.map((t) => (
          <TypeItem
            key={t.id}
            s={s}
            t={t}
            open={open === t.id}
            onToggle={() => setOpen(open === t.id ? null : t.id)}
          />
        ))}
      </ul>
      <button data-testid="type-new" onClick={create}>
        + Nový typ
      </button>
      <button data-testid="type-purge" onClick={() => s.run('wallType.purgeUnused', {})}>
        Vyčistit nepoužité
      </button>
      <LibraryLoad s={s} />
    </section>
  );
}
