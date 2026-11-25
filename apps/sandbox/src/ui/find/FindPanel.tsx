// Panel Najít a vybrat pod lupou v liště příkazů (koncepce rozhraní, část 2 B; vzor: Archicad Find &
// Select). Kritéria → dotaz jádra `element.find` (stejný jako pro AI) → přidat / odebrat / nahradit výběr.
// Uložené sady kritérií přijdou později.
import type { FindCategory, FindResult } from '@bim-light/core';
import { useState } from 'preact/hooks';
import type { Session } from '../../session/session.ts';
import { IconButton } from '../icons/Icon.tsx';
import { EMPTY_FORM, toCriteria, type FindForm } from './criteria.ts';
import { FindFields } from './FindFields.tsx';

const CATEGORIES: [FindCategory, string][] = [
  ['wall', 'Stěna'],
  ['opening', 'Otvor'],
  ['dimension', 'Kóty'],
];

function apply(s: Session, r: FindResult, how: 'add' | 'remove' | 'replace') {
  const cur = s.selection;
  const merge = (a: readonly string[], b: readonly string[]) =>
    how === 'replace' ? [...b] : how === 'add' ? [...new Set([...a, ...b])] : a.filter((x) => !b.includes(x));
  s.selection.set(merge(cur.walls, r.walls), merge(cur.dims, r.dimensions), merge(cur.openings, r.openings));
  s.changed();
}

export function FindPanel({ s, onClose }: { s: Session; onClose: () => void }) {
  const [f, setF] = useState<FindForm>(EMPTY_FORM);
  const q = s.editor.query('element.find', toCriteria(f, s.storeyId));
  const r: FindResult = q.ok ? (q.data as FindResult) : { walls: [], openings: [], dimensions: [] };
  const count = r.walls.length + r.openings.length + r.dimensions.length;
  const toggle = (c: FindCategory) =>
    setF({
      ...f,
      categories: f.categories.includes(c) ? f.categories.filter((x) => x !== c) : [...f.categories, c],
    });
  return (
    <div class="find-panel" data-testid="find-panel">
      <div class="find-head">
        <strong>Najít a vybrat</strong>
        <IconButton icon="close" label="Zavřít" onClick={onClose} />
      </div>
      <div class="muted">Typ prvku</div>
      <div class="chips">
        {CATEGORIES.map(([c, label]) => (
          <button
            key={c}
            data-testid={`find-cat-${c}`}
            class={f.categories.includes(c) ? 'chip on' : 'chip'}
            onClick={() => toggle(c)}
          >
            {label}
          </button>
        ))}
      </div>
      <FindFields s={s} f={f} set={setF} />
      <div class="find-count" data-testid="find-count">
        Nalezeno <strong>{count}</strong> prvků
      </div>
      <div class="find-actions">
        <button class="primary" data-testid="find-add" onClick={() => apply(s, r, 'add')}>
          + Vybrat
        </button>
        <button data-testid="find-remove" onClick={() => apply(s, r, 'remove')}>
          − Odebrat
        </button>
        <button data-testid="find-replace" onClick={() => apply(s, r, 'replace')}>
          Nahradit výběr
        </button>
        <button data-testid="find-clear" class="link" onClick={() => setF(EMPTY_FORM)}>
          Vymazat
        </button>
      </div>
    </div>
  );
}
