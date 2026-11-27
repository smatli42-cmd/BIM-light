// Levý sloupec okna Editor typů pro desky: hledání a seznam typů rozdělený podle funkce na nosné desky
// (stropy, základové desky) a podlahy; u typu značka, tloušťka skladby a počet desek.
import { slabThickness, slabTypeUsage, SLAB_FUNCTIONS, type SlabFunction } from '@bim-light/core';
import { useState } from 'preact/hooks';
import type { Session } from '../../session/session.ts';

export const SLAB_GROUPS: Record<SlabFunction, string> = { structure: 'Nosné desky', floor: 'Podlahy' };

export function SlabTypeList({ s }: { s: Session }) {
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const all = Object.values(s.model.slabTypes).filter(
    (t) => !q || t.name.toLowerCase().includes(q) || t.mark.toLowerCase() === q,
  );
  const pick = (id: string) => ((s.typeEditor = id), s.changed());
  return (
    <div class="te-list" data-testid="slab-types">
      <input
        data-testid="type-search"
        placeholder="Hledat typ…"
        value={query}
        onInput={(e) => setQuery(e.currentTarget.value)}
      />
      {SLAB_FUNCTIONS.map((fn) => (
        <section key={fn} data-testid={`slab-group-${fn}`}>
          <p class="te-group muted">{SLAB_GROUPS[fn]}</p>
          <ul class="material-list">
            {all
              .filter((t) => t.slabFunction === fn)
              .map((t) => (
                <li key={t.id}>
                  <button
                    class={`material-row${s.typeEditor === t.id ? ' active' : ''}`}
                    data-testid="type-row"
                    onClick={() => pick(t.id)}
                  >
                    <span>
                      <b class="te-mark">{t.mark}</b> {t.name}
                    </span>
                    <span class="muted">
                      {slabThickness(s.model, t.id)} mm · {slabTypeUsage(s.model, t.id)}×
                    </span>
                  </button>
                </li>
              ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
