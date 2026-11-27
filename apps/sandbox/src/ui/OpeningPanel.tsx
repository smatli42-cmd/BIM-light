// Panel otvoru (plán stěn Z4): rozměry nového otvoru (nástroj Otvor) a vlastnosti vybraných otvorů.
// Pole vznikají z popisu parametrů příkazu (základ 15b); změna jde přes příkaz jádra (základ 6).
import { openingWarnings, type JsonSchema } from '@bim-light/core';
import type { Session } from '../session/session.ts';
import type { OpeningDefaults } from '../session/opening-defaults.ts';
import { SchemaForm } from './SchemaForm.tsx';
import { NewStatusField } from './infobox/NewStatus.tsx';
import { OpeningHost, SlabHoleMethod } from './infobox/SlabOpeningInfo.tsx';

const SIZE = ['width', 'height', 'sill', 'kind', 'depth', 'side'] as const;
const LABELS: Record<string, string> = {
  width: 'Šířka',
  height: 'Výška',
  sill: 'Parapet',
  kind: 'Druh',
  depth: 'Hloubka niky',
  side: 'Strana niky',
  status: 'Stav',
};
const OPTIONS = {
  kind: [
    { value: 'through', label: 'průchozí' },
    { value: 'niche', label: 'nika' },
  ],
  side: [
    { value: 'ref', label: 'referenční líc' },
    { value: 'opp', label: 'protější líc' },
  ],
  status: [
    { value: 'new', label: 'nový' },
    { value: 'existing', label: 'stávající' },
    { value: 'demolished', label: 'bourání' },
  ],
};

/** Podlaha v otvoru až k podlaze (opening.setFloorSplit): A = místnost u referenčního líce. */
const FLOOR_LABELS = [
  ['split', 'rozdělit (do osy stěny)'],
  ['ref', 'celá z místnosti A (ref. líc)'],
  ['opp', 'celá z místnosti B (protější líc)'],
  ['none', 'žádná'],
] as const;

/** Pole z popisu parametrů příkazu; nika bez hloubky a strany se u průchozího otvoru neukazuje. */
function fieldsOf(s: Session, command: string, keys: readonly string[], niche: boolean) {
  const props = s.registry.get(command)?.params.properties ?? {};
  const out: Record<string, JsonSchema> = {};
  for (const k of keys) {
    const f = props[k];
    if (f && (niche || (k !== 'depth' && k !== 'side'))) out[k] = f;
  }
  return out;
}

function NewOpening({ s }: { s: Session }) {
  const d = s.openingDefaults;
  return (
    <section data-testid="new-opening">
      <h2>Nový otvor</h2>
      <OpeningHost s={s} />
      {d.host === 'slab' ? (
        <SlabHoleMethod s={s} />
      ) : (
        <SchemaForm
          fields={fieldsOf(s, 'opening.create', SIZE, d.kind === 'niche')}
          labels={LABELS}
          options={OPTIONS}
          value={d as unknown as Record<string, unknown>}
          onChange={(k, v) => {
            s.openingDefaults = { ...d, [k]: v } as OpeningDefaults;
            s.changed();
          }}
        />
      )}
      <NewStatusField s={s} />
    </section>
  );
}

function SelectedOpenings({ s }: { s: Session }) {
  const ops = s.selection.openings.map((id) => s.model.openings[id]).filter((o) => !!o);
  const first = ops[0];
  if (!first) return null;
  const ids = ops.map((o) => o.id);
  const warnings = ops.flatMap((o) => openingWarnings(s.model, o));
  return (
    <section data-testid="sel-openings">
      <h2>Vybrané otvory ({ops.length})</h2>
      <SchemaForm
        fields={fieldsOf(s, 'opening.update', [...SIZE, 'status'], first.kind === 'niche')}
        labels={LABELS}
        options={OPTIONS}
        value={first as unknown as Record<string, unknown>}
        onChange={(k, v) => s.run('opening.update', { openingIds: ids, [k]: v })}
      />
      {first.kind === 'through' && first.sill <= 1 && (
        <label>
          Podlaha v otvoru
          <select
            data-testid="opening-floor-split"
            value={first.floorSplit ?? 'split'}
            onChange={(e) =>
              s.run('opening.setFloorSplit', { openingIds: ids, split: e.currentTarget.value })
            }
          >
            {FLOOR_LABELS.map(([v, label]) => (
              <option key={v} value={v}>
                {label}
              </option>
            ))}
          </select>
        </label>
      )}
      {warnings.map((w) => (
        <p class="warn" key={w}>
          {w}
        </p>
      ))}
      <button onClick={() => s.run('opening.delete', { openingIds: ids })}>
        Smazat <kbd>Del</kbd>
      </button>
    </section>
  );
}

export function OpeningPanel({ s }: { s: Session }) {
  return (
    <>
      <SelectedOpenings s={s} />
      {s.tool.id === 'opening' && <NewOpening s={s} />}
    </>
  );
}
