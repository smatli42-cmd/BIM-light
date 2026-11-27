// Pohodlí úprav vybraných stěn v info boxu (plán stěn Z9): pipeta (přenést vlastnosti z jedné stěny
// na jiné, Revit „Match Type“, Archicad pipeta a stříkačka) a výběr stejných stěn (typ, podlaží, stav).
// Vše přes příkaz wall.matchProperties a dotaz wall.findSame – stejně jako AI.
import { findWall } from '@bim-light/core';
import type { Id, Wall } from '@bim-light/core';
import { useState } from 'preact/hooks';
import type { Session } from '../../session/session.ts';
import { Section } from './Section.tsx';

/** Zdrojová stěna pipety (platí do přenesení nebo nového nasátí). */
let source: Id | null = null;

const SAME: [string, string[]][] = [
  ['Stejný typ na podlaží', ['type', 'storey']],
  ['Stejný typ v projektu', ['type']],
  ['Stejný typ a stav na podlaží', ['type', 'storey', 'status']],
];

function Pipette({ s, walls }: { s: Session; walls: Wall[] }) {
  const src = findWall(s.model, source);
  const targets = walls.filter((w) => w.id !== source).map((w) => w.id);
  const srcType = src && s.model.wallTypes[src.typeId];
  const only = walls.length === 1 ? walls[0] : undefined;
  return (
    <span class="row">
      {only && (
        <button data-testid="match-pick" onClick={() => ((source = only.id), s.changed())}>
          Nasát vlastnosti
        </button>
      )}
      {src && targets.length > 0 && (
        <button
          data-testid="match-apply"
          title="Typ, výška a vlastnosti (poloha se nemění)"
          onClick={() => s.run('wall.matchProperties', { sourceWallId: src.id, wallIds: targets })}
        >
          Přenést z {srcType?.mark ?? ''} {srcType?.name ?? ''}
        </button>
      )}
    </span>
  );
}

function SelectSame({ s, wall }: { s: Session; wall: Wall }) {
  const [i, setI] = useState(0);
  const pick = () => {
    const r = s.editor.query('wall.findSame', { wallId: wall.id, by: SAME[i]?.[1] });
    if (!r.ok) return;
    s.selection.set(r.data as Id[]);
    s.changed();
  };
  return (
    <span class="row">
      <select data-testid="same-by" value={i} onChange={(e) => setI(Number(e.currentTarget.value))}>
        {SAME.map(([label], k) => (
          <option key={label} value={k}>
            {label}
          </option>
        ))}
      </select>
      <button data-testid="select-same" onClick={pick}>
        Vybrat
      </button>
    </span>
  );
}

/** Sekce Úpravy: pipeta a výběr stejných. */
export function WallEditsSection({ s, walls }: { s: Session; walls: Wall[] }) {
  return (
    <Section
      title="Úpravy"
      info="Pipeta: nasaj vlastnosti jedné stěny, vyber jiné a přenes. Výběr stejných nahradí výběr."
      testid="wall-edits"
    >
      <Pipette s={s} walls={walls} />
      {walls[0] && <SelectSame s={s} wall={walls[0]} />}
    </Section>
  );
}
