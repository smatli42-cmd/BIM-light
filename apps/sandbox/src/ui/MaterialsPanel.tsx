// Panel Materiály (podle arditu): hlavička s počtem, hledání, seznam s náhledem šrafy; rozbalení =
// pole z popisu parametrů (základ 15b), Použití, Duplikovat, Smazat (s náhradou). Vše přes příkazy.
import {
  HATCH_LIBRARY,
  MATERIAL_FIELDS,
  materialFill,
  materialLines,
  materialUsage,
  type Material,
} from '@bim-light/core';
import { useState } from 'preact/hooks';
import type { Session } from '../session/session.ts';
import { HatchSwatch } from './HatchSwatch.tsx';
import { SchemaForm } from './SchemaForm.tsx';
import { LevelSelect } from './priorities/LevelList.tsx';
import { openPriorities } from './priorities/PrioritiesDialog.tsx';

const LABELS: Record<string, string> = {
  name: 'Název',
  category: 'Kategorie',
  color: 'Barva',
  hatchId: 'Šrafa',
  hatchPen: 'Pero šrafy',
  lineColor: 'Barva čar 2D',
  fillColor: 'Barva výplně 2D',
  transparent3D: 'Průhledný ve 3D',
  note: 'Poznámka',
};

/** Pole panelu bez úrovně priority (ta má vlastní volbu s odkazem na okno priorit). */
const { joinLevelId: _level, ...FIELDS } = MATERIAL_FIELDS;

const HATCH_OPTIONS = HATCH_LIBRARY.map((h) => ({ value: h.id, label: `${h.order}. ${h.name}` }));

/** Úroveň priority spojování materiálu a odkaz na okno Nastavení → Priority spojování. */
function JoinLevelField({ s, m }: { s: Session; m: Material }) {
  return (
    <>
      <label>
        Priorita spojování
        <span class="muted">spoje stěn: úroveň výš projede nižší</span>
        <LevelSelect s={s} m={m} testid="material-join-level" />
      </label>
      <button data-testid="material-priorities" onClick={() => openPriorities(s)}>
        Priority spojování…
      </button>
    </>
  );
}

function Detail({ s, m }: { s: Session; m: Material }) {
  const use = materialUsage(s.model, m.id);
  const others = Object.values(s.model.materials).filter((x) => x.id !== m.id);
  const [replacement, setReplacement] = useState(others[0]?.id ?? '');
  const update = (key: string, value: unknown) =>
    s.run('material.update', { materialId: m.id, [key]: value });
  return (
    <div class="material-detail" data-testid="material-detail">
      <SchemaForm
        fields={FIELDS}
        labels={LABELS}
        value={m as unknown as Record<string, unknown>}
        options={{ hatchId: HATCH_OPTIONS }}
        derived={{ lineColor: materialLines(m), fillColor: materialFill(m) }}
        onChange={update}
      />
      <JoinLevelField s={s} m={m} />
      <p class="muted" data-testid="material-usage">
        Použití: {use.elements} prvků, {use.types} skladeb
      </p>
      <button onClick={() => s.run('material.duplicate', { materialId: m.id })}>Duplikovat</button>
      {use.types > 0 && (
        <label>
          Náhrada při smazání
          <select value={replacement} onChange={(e) => setReplacement(e.currentTarget.value)}>
            {others.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </label>
      )}
      <button
        data-testid="material-delete"
        onClick={() =>
          s.run('material.delete', {
            materialId: m.id,
            ...(use.types > 0 ? { replacementId: replacement } : {}),
          })
        }
      >
        Smazat
      </button>
    </div>
  );
}

export function MaterialsPanel({ s }: { s: Session }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const all = Object.values(s.model.materials);
  const q = query.trim().toLowerCase();
  const shown = all.filter((m) => !q || `${m.name} ${m.category}`.toLowerCase().includes(q));
  return (
    <section data-testid="materials">
      <h2>Materiály · {all.length}</h2>
      <input
        data-testid="material-search"
        placeholder="Hledat…"
        value={query}
        onInput={(e) => setQuery(e.currentTarget.value)}
      />
      <ul class="material-list">
        {shown.map((m) => (
          <li key={m.id}>
            <button
              class="material-row"
              data-testid="material-row"
              onClick={() => setOpen(open === m.id ? null : m.id)}
            >
              <HatchSwatch
                hatch={s.model.display.hatches[m.hatchId]}
                lines={materialLines(m)}
                fill={materialFill(m)}
                size={28}
              />
              <span>{m.name}</span>
              <span class="muted">{m.category}</span>
            </button>
            {open === m.id && <Detail s={s} m={m} />}
          </li>
        ))}
      </ul>
    </section>
  );
}
