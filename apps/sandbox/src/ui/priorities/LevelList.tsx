// Úrovně priorit spojování shora dolů (výš projede níž): tažení nebo šipky ↑ ↓, přejmenování, smazání
// (jen prázdná, jinak s přesunem materiálů), pod každou úrovní materiály s volbou úrovně. Vše příkazy.
import {
  materialFill,
  materialLevelId,
  materialLines,
  MATERIAL_CATEGORIES,
  type JoinLevel,
  type Material,
} from '@bim-light/core';
import { useState } from 'preact/hooks';
import type { Session } from '../../session/session.ts';
import { HatchSwatch } from '../HatchSwatch.tsx';
import { startDrag, type OnDrop } from './drag.ts';

/** Volba úrovně materiálu: „podle kategorie“ nebo konkrétní úroveň. */
export function LevelSelect({ s, m, testid }: { s: Session; m: Material; testid?: string }) {
  const jp = s.model.joinPriorities;
  const byCat = jp.levels.find((l) => l.id === jp.categoryLevels[m.category]);
  return (
    <select
      data-testid={testid}
      value={m.joinLevelId ?? ''}
      onChange={(e) => {
        const v = e.currentTarget.value;
        s.run('material.setJoinLevel', { materialIds: [m.id], levelId: v || null });
      }}
    >
      <option value="">podle kategorie ({byCat?.name ?? '?'})</option>
      {jp.levels.map((l) => (
        <option key={l.id} value={l.id}>
          {l.name}
        </option>
      ))}
    </select>
  );
}

function MaterialRow({ s, m, onDrop }: { s: Session; m: Material; onDrop: OnDrop }) {
  return (
    <li class="jp-material" data-testid="jp-material" data-name={m.name}>
      <span
        class="jp-handle"
        data-testid="jp-material-handle"
        title="Táhni do jiné úrovně"
        onPointerDown={(e) => startDrag(e, { kind: 'material', id: m.id }, onDrop)}
      >
        <HatchSwatch
          hatch={s.model.display.hatches[m.hatchId]}
          lines={materialLines(m)}
          fill={materialFill(m)}
          size={20}
        />
        <span class={m.joinLevelId === null ? 'muted' : ''}>{m.name}</span>
      </span>
      <LevelSelect s={s} m={m} testid="jp-material-level" />
    </li>
  );
}

function DeleteLevel({ s, level, used }: { s: Session; level: JoinLevel; used: boolean }) {
  const others = s.model.joinPriorities.levels.filter((l) => l.id !== level.id);
  if (!used)
    return (
      <button
        class="jp-small"
        title="Smazat prázdnou úroveň"
        onClick={() => s.run('material.deletePriorityLevel', { levelId: level.id })}
      >
        ×
      </button>
    );
  return (
    <select
      class="jp-move"
      title="Smazat úroveň: vyber, kam přesunout její materiály a kategorie"
      value=""
      onChange={(e) =>
        s.run('material.deletePriorityLevel', { levelId: level.id, moveTo: e.currentTarget.value })
      }
    >
      <option value="">Smazat…</option>
      {others.map((l) => (
        <option key={l.id} value={l.id}>
          {l.name}
        </option>
      ))}
    </select>
  );
}

interface RowProps {
  s: Session;
  level: JoinLevel;
  index: number;
  onDrop: OnDrop;
}

type HeadProps = RowProps & { used: boolean };

/** Záhlaví úrovně: úchop pro tažení, pořadí, název, ↑ ↓, smazání. */
function LevelHead({ s, level, index, used, onDrop }: HeadProps) {
  const count = s.model.joinPriorities.levels.length;
  const move = (to: number) => s.run('material.movePriorityLevel', { levelId: level.id, index: to });
  return (
    <div class="jp-level-head">
      <span
        class="jp-grip"
        data-testid="jp-grip"
        title="Táhni pro přesun úrovně"
        onPointerDown={(e) => startDrag(e, { kind: 'level', id: level.id }, onDrop)}
      >
        ⠿
      </span>
      <span class="jp-rank">{count - index}</span>
      <input
        class="jp-name"
        data-testid="jp-level-name"
        value={level.name}
        onChange={(e) =>
          s.run('material.renamePriorityLevel', { levelId: level.id, name: e.currentTarget.value })
        }
      />
      <button
        class="jp-small"
        data-testid="jp-up"
        title="Výš"
        disabled={index === 0}
        onClick={() => move(index - 1)}
      >
        ↑
      </button>
      <button
        class="jp-small"
        data-testid="jp-down"
        title="Níž"
        disabled={index === count - 1}
        onClick={() => move(index + 1)}
      >
        ↓
      </button>
      <DeleteLevel s={s} level={level} used={used} />
    </div>
  );
}

function LevelRow({ s, level, index, onDrop }: RowProps) {
  const jp = s.model.joinPriorities;
  const mats = Object.values(s.model.materials).filter((m) => materialLevelId(s.model, m) === level.id);
  const cats = MATERIAL_CATEGORIES.filter((c) => jp.categoryLevels[c] === level.id);
  const used = mats.some((m) => m.joinLevelId === level.id) || cats.length > 0;
  return (
    <li class="jp-level" data-testid="jp-level" data-name={level.name} data-level-id={level.id}>
      <LevelHead s={s} level={level} index={index} used={used} onDrop={onDrop} />
      {cats.length > 0 && <div class="muted jp-cats">kategorie: {cats.join(', ')}</div>}
      <ul class="jp-materials">
        {mats.map((m) => (
          <MaterialRow key={m.id} s={s} m={m} onDrop={onDrop} />
        ))}
      </ul>
    </li>
  );
}

export function LevelList({ s }: { s: Session }) {
  const levels = s.model.joinPriorities.levels;
  const onDrop: OnDrop = (d, levelId) => {
    const index = levels.findIndex((l) => l.id === levelId);
    if (d.kind === 'level' && d.id !== levelId) s.run('material.movePriorityLevel', { levelId: d.id, index });
    if (d.kind === 'material') s.run('material.setJoinLevel', { materialIds: [d.id], levelId });
  };
  const [name, setName] = useState('');
  const add = () => {
    if (name.trim()) s.run('material.addPriorityLevel', { name: name.trim() });
    setName('');
  };
  return (
    <div class="jp-levels">
      <p class="muted">Úroveň výš projede úroveň níž (spoje stěn, uložení stropu). Šedě = podle kategorie.</p>
      <ol class="jp-list" data-testid="jp-levels">
        {levels.map((l, i) => (
          <LevelRow key={l.id} s={s} level={l} index={i} onDrop={onDrop} />
        ))}
      </ol>
      <div class="jp-add">
        <input
          data-testid="jp-new-name"
          placeholder="Nová úroveň…"
          value={name}
          onInput={(e) => setName(e.currentTarget.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
        />
        <button data-testid="jp-add" onClick={add}>
          + Úroveň
        </button>
      </div>
    </div>
  );
}
