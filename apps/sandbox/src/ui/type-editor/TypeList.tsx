// Levý sloupec okna Editor typů: seznam typů s hledáním, tloušťkou a použitím; nový typ, načtení
// z knihovny typů a vyčištění nepoužitých. Vše přes příkazy jádra (wallType.*).
import { bandThickness, WALL_TYPE_LIBRARY, wallTypeUsage } from '@bim-light/core';
import { useState } from 'preact/hooks';
import type { Session } from '../../session/session.ts';

function freeName(s: Session, base: string): string {
  const names = new Set(Object.values(s.model.wallTypes).map((t) => t.name));
  let name = base;
  for (let i = 2; names.has(name); i++) name = `${base} ${i}`;
  return name;
}

const pick = (s: Session, id: string | null | undefined) => {
  s.typeEditor = id ?? null;
  s.changed();
};

function LibraryLoad({ s }: { s: Session }) {
  const inProject = new Set(Object.values(s.model.wallTypes).map((t) => t.source?.itemId));
  const missing = WALL_TYPE_LIBRARY.filter((t) => !inProject.has(t.key));
  const [key, setKey] = useState('');
  if (missing.length === 0) return null;
  const chosen = missing.some((t) => t.key === key) ? key : (missing[0]?.key ?? '');
  const load = () => {
    const r = s.run('wallType.load', { key: chosen });
    if (r.ok) pick(s, r.created[0]);
  };
  return (
    <label>
      Z knihovny typů
      <span class="row">
        <select data-testid="type-library" value={chosen} onChange={(e) => setKey(e.currentTarget.value)}>
          {missing.map((t) => (
            <option key={t.key} value={t.key}>
              {t.name}
            </option>
          ))}
        </select>
        <button data-testid="type-load" onClick={load}>
          Načíst
        </button>
      </span>
    </label>
  );
}

function NewType({ s }: { s: Session }) {
  const material =
    Object.values(s.model.materials).find((m) => m.category === 'Zdivo') ??
    Object.values(s.model.materials)[0];
  const create = () => {
    const r = s.run('wallType.create', {
      name: freeName(s, 'Nový typ'),
      layers: [{ materialId: material?.id ?? '', thickness: 200, function: 'core' }],
    });
    if (r.ok) pick(s, r.created[0]);
  };
  return (
    <span class="row">
      <button data-testid="type-new" onClick={create}>
        + Nový typ
      </button>
      <button data-testid="type-purge" onClick={() => s.run('wallType.purgeUnused', {})}>
        Vyčistit nepoužité
      </button>
    </span>
  );
}

export function TypeList({ s }: { s: Session }) {
  const [query, setQuery] = useState('');
  const all = Object.values(s.model.wallTypes);
  const q = query.trim().toLowerCase();
  const shown = all.filter((t) => !q || t.name.toLowerCase().includes(q) || t.mark.toLowerCase() === q);
  return (
    <div class="te-list" data-testid="wall-types">
      <input
        data-testid="type-search"
        placeholder="Hledat typ…"
        value={query}
        onInput={(e) => setQuery(e.currentTarget.value)}
      />
      <ul class="material-list">
        {shown.map((t) => (
          <li key={t.id}>
            <button
              class={`material-row${s.typeEditor === t.id ? ' active' : ''}`}
              data-testid="type-row"
              onClick={() => pick(s, t.id)}
            >
              <span>
                <b class="te-mark">{t.mark}</b> {t.name}
              </span>
              <span class="muted">
                {t.bands[0] ? bandThickness(t.bands[0]) : 0} mm · {wallTypeUsage(s.model, t.id)}×
              </span>
            </button>
          </li>
        ))}
      </ul>
      <NewType s={s} />
      <LibraryLoad s={s} />
    </div>
  );
}
